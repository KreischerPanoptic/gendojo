# =============================================================================
# GenDojo — Docker image
# Base: RunPod PyTorch image (PyTorch 2.4.0 + Python 3.11 + CUDA 12.4.1)
# =============================================================================

FROM runpod/pytorch:1.0.2-cu1281-torch280-ubuntu2404

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production

# ---------------------------------------------------------------------------
# Пути данных — монтируются как volumes при запуске
# На RunPod: сетевой volume монтируется отдельными папками
# Локально:  -v ./models:/app/models  и т.д.
# ---------------------------------------------------------------------------
ENV MODELS_PATH=/app/models
ENV DATASETS_PATH=/app/datasets
ENV OUTPUTS_PATH=/app/outputs
ENV LOGS_PATH=/app/logs
ENV TEMP_PATH=/app/temp
ENV SETTINGS_PATH=/app/gendojo/settings.json

# ---------------------------------------------------------------------------
# sd-scripts и accelerate
# ---------------------------------------------------------------------------
ENV SD_SCRIPTS_PATH=/app/sd-scripts
ENV ACCELERATE_CONFIG_PATH=/app/configs/accelerate/default_config.yaml
ENV ACCELERATE_BIN=/usr/local/bin/accelerate

# ---------------------------------------------------------------------------
# System deps
# ---------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    wget \
    ca-certificates \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# Node.js 20 + pnpm
# ---------------------------------------------------------------------------
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm@9

# ---------------------------------------------------------------------------
# sd-scripts Python dependencies
# Субмодуль должен быть инициализирован до билда:
#   git clone --recurse-submodules ...
# ---------------------------------------------------------------------------
WORKDIR /app

COPY sd-scripts/ ./sd-scripts/

RUN pip install --no-cache-dir \
        accelerate \
        toml \
        tensorboard \
        safetensors \
        huggingface_hub \
    && cd sd-scripts && pip install --no-cache-dir -r requirements.txt

# ---------------------------------------------------------------------------
# accelerate config
# ---------------------------------------------------------------------------
COPY configs/accelerate/runpod.yaml /app/configs/accelerate/runpod.yaml
RUN cp /app/configs/accelerate/runpod.yaml /app/configs/accelerate/default_config.yaml \
    && mkdir -p /root/.cache/huggingface/accelerate \
    && cp /app/configs/accelerate/runpod.yaml \
          /root/.cache/huggingface/accelerate/default_config.yaml

# ---------------------------------------------------------------------------
# Frontend — build React app
# pnpm-workspace.yaml удаляется — в образе каждый пакет собирается изолированно
# NODE_ENV=development нужен чтобы pnpm поставил devDependencies (tsc, vite и т.д.)
# ---------------------------------------------------------------------------
COPY ui/package.json ui/pnpm-lock.yaml ui/pnpm-workspace.yaml ./ui/
RUN cd ui && rm -f pnpm-workspace.yaml \
    && NODE_ENV=development pnpm install --frozen-lockfile

COPY ui/ ./ui/
RUN cd ui && rm -f pnpm-workspace.yaml && pnpm build

# ---------------------------------------------------------------------------
# Backend — build NestJS
# ---------------------------------------------------------------------------
COPY api/package.json api/pnpm-lock.yaml api/pnpm-workspace.yaml ./api/
RUN cd api && rm -f pnpm-workspace.yaml \
    && NODE_ENV=development pnpm install --frozen-lockfile

COPY api/ ./api/

# Копируем собранный фронт в api/public — NestJS сервит его как статику
RUN mkdir -p api/public && cp -r ui/dist/. api/public/

RUN cd api && rm -f pnpm-workspace.yaml && pnpm build

# ---------------------------------------------------------------------------
# Data directories — перекрываются volume mount'ами при запуске
# Нужны чтобы контейнер стартовал без ошибок если volume не примонтирован
# ---------------------------------------------------------------------------
RUN mkdir -p \
    /app/models \
    /app/datasets \
    /app/outputs \
    /app/logs \
    /app/temp \
    /app/gendojo

# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3000

CMD ["/app/start.sh"]