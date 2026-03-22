# syntax=docker/dockerfile:1
# =============================================================================
# GenDojo — Multi-stage build
#
# Stage 1 (ui-builder):    node:20-slim  → React production bundle
# Stage 2 (api-builder):   node:20-slim  → NestJS dist/ + prod node_modules
# Stage 3 (runtime):       RunPod CUDA   → artifacts from stage 1 and 2
#
# =============================================================================

# =============================================================================
# Stage 1 — UI build
# =============================================================================
FROM oven/bun:1.3-slim AS ui-builder
WORKDIR /build

COPY ui/package.json ui/bun.lock ./ 
RUN bun install --frozen-lockfile

COPY ui/ ./
RUN bun run build


# =============================================================================
# Stage 2 — API build
# =============================================================================
FROM oven/bun:1.3-slim AS api-builder
WORKDIR /build

COPY api/package.json api/bun.lock ./
RUN bun install --frozen-lockfile

COPY api/ ./
RUN bun run build
RUN rm -rf node_modules && bun install --frozen-lockfile --production

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

RUN apt-get update && apt-get install -y curl unzip \
    && curl -fsSL https://bun.sh/install | bash \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

COPY sd-scripts/requirements.txt ./sd-scripts/requirements.txt

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install \
        accelerate \
        toml \
        tensorboard \
        safetensors \
        huggingface_hub \
    && grep -v '^-e' ./sd-scripts/requirements.txt | pip install -r /dev/stdin

COPY sd-scripts/ ./sd-scripts/

# -----------------------------------------------------------------------------
# accelerate config
# -----------------------------------------------------------------------------
COPY configs/accelerate/ ./configs/accelerate/

RUN cp ./configs/accelerate/runpod.yaml ./configs/accelerate/default_config.yaml \
    && mkdir -p /root/.cache/huggingface/accelerate \
    && cp ./configs/accelerate/runpod.yaml \
          /root/.cache/huggingface/accelerate/default_config.yaml

COPY --from=ui-builder  /build/dist/        ./api/public/
COPY --from=api-builder /build/dist/        ./api/dist/
COPY --from=api-builder /build/node_modules/ ./api/node_modules/
COPY --from=api-builder /build/package.json  ./api/package.json

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