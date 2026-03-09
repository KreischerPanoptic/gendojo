# syntax=docker/dockerfile:1
# =============================================================================
# GenDojo — Multi-stage build
#
# Stage 1 (ui-builder):    node:20-slim  → React production bundle
# Stage 2 (api-builder):   node:20-slim  → NestJS dist/ + prod node_modules
# Stage 3 (runtime):       RunPod CUDA   → только артефакты из 1 и 2
#
# Что убирает multi-stage по сравнению с монолитным образом:
#   - pnpm + npm глобальные пакеты (~100 MB)
#   - devDependencies (TypeScript, Jest, ESLint, Vite...) (~400-700 MB)
#   - Node.js build cache
#   - Python pip cache (BuildKit cache mount — быстро, в образ не попадает)
# =============================================================================

# =============================================================================
# Stage 1 — UI build
# =============================================================================
FROM node:24.14-slim AS ui-builder

RUN npm install -g pnpm@9 --no-update-notifier --quiet

WORKDIR /build

# Слой с зависимостями отдельно — инвалидируется только при изменении lockfile
COPY ui/package.json ui/pnpm-lock.yaml ui/pnpm-workspace.yaml ./
RUN rm -f pnpm-workspace.yaml && pnpm install --frozen-lockfile

COPY ui/ ./
RUN rm -f pnpm-workspace.yaml && pnpm build
# /build/dist — готовый React bundle


# =============================================================================
# Stage 2 — API build
# =============================================================================
FROM node:24.14-slim AS api-builder

RUN npm install -g pnpm@9 --no-update-notifier --quiet

WORKDIR /build

COPY api/package.json api/pnpm-lock.yaml api/pnpm-workspace.yaml ./
# Все зависимости нужны чтобы скомпилировать TypeScript
RUN rm -f pnpm-workspace.yaml && pnpm install --frozen-lockfile

COPY api/ ./

# Компиляция TS → JS
RUN rm -f pnpm-workspace.yaml && pnpm build

# Удаляем devDependencies — в финальный образ идут только prod deps
RUN pnpm prune --prod
# /build/dist          — скомпилированный NestJS
# /build/node_modules  — только production зависимости


# =============================================================================
# Stage 3 — Runtime (CUDA)
# =============================================================================
FROM runpod/pytorch:1.0.2-cu1281-torch280-ubuntu2404

# -----------------------------------------------------------------------------
# Environment
# -----------------------------------------------------------------------------
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production

ENV MODELS_PATH=/app/models \
    DATASETS_PATH=/app/datasets \
    OUTPUTS_PATH=/app/outputs \
    LOGS_PATH=/app/logs \
    TEMP_PATH=/app/temp \
    SETTINGS_PATH=/app/gendojo/settings.json \
    SD_SCRIPTS_PATH=/app/sd-scripts \
    ACCELERATE_CONFIG_PATH=/app/configs/accelerate/default_config.yaml \
    ACCELERATE_BIN=/usr/local/bin/accelerate

# -----------------------------------------------------------------------------
# System deps + Node.js runtime
# Один RUN — один слой, один apt clean
# git нужен huggingface_hub при некоторых операциях с репозиториями
# pnpm НЕ ставим — в финальном образе он не нужен
# -----------------------------------------------------------------------------
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        git \
        libgl1 \
        libglib2.0-0 \
        libgomp1 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# -----------------------------------------------------------------------------
# Python — sd-scripts deps
#
# --mount=type=cache: pip скачивает пакеты один раз и кеширует на build-хосте.
# При следующем билде без изменений в requirements.txt — мгновенно.
# В финальный образ кеш НЕ попадает.
#
# Порядок важен: сначала копируем только requirements.txt (дешёвый COPY),
# чтобы при изменениях в sd-scripts коде слой с pip не инвалидировался.
# -----------------------------------------------------------------------------
COPY sd-scripts/requirements.txt ./sd-scripts/requirements.txt

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install \
        accelerate \
        toml \
        tensorboard \
        safetensors \
        huggingface_hub \
    && grep -v '^-e' ./sd-scripts/requirements.txt | pip install -r /dev/stdin

# sd-scripts source (после pip — чтобы изменения в .py не пересобирали pip слой)
COPY sd-scripts/ ./sd-scripts/

# -----------------------------------------------------------------------------
# accelerate config
# -----------------------------------------------------------------------------
COPY configs/accelerate/ ./configs/accelerate/

RUN cp ./configs/accelerate/runpod.yaml ./configs/accelerate/default_config.yaml \
    && mkdir -p /root/.cache/huggingface/accelerate \
    && cp ./configs/accelerate/runpod.yaml \
          /root/.cache/huggingface/accelerate/default_config.yaml

# -----------------------------------------------------------------------------
# Node.js app — копируем только артефакты из build stages
# pnpm-workspace.yaml и прочий build tooling сюда не попадает
# -----------------------------------------------------------------------------
COPY --from=ui-builder  /build/dist/        ./api/public/
COPY --from=api-builder /build/dist/        ./api/dist/
COPY --from=api-builder /build/node_modules/ ./api/node_modules/
COPY --from=api-builder /build/package.json  ./api/package.json

# -----------------------------------------------------------------------------
# Data directories — при запуске перекрываются volume mount'ами
# Нужны чтобы контейнер стартовал без ошибок если volume не примонтирован
# -----------------------------------------------------------------------------
RUN mkdir -p \
    /app/models \
    /app/datasets \
    /app/outputs \
    /app/logs \
    /app/temp \
    /app/gendojo

# -----------------------------------------------------------------------------
# Entrypoint
# -----------------------------------------------------------------------------
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3000
CMD ["/app/start.sh"]