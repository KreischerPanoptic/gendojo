# =============================================================================
# GenDojo — Docker image
# Base: RunPod PyTorch image (PyTorch 2.4.0 + Python 3.11 + CUDA 12.4.1)
# Avoids re-downloading 3 GB of PyTorch on every build.
# =============================================================================

FROM runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production

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
# The submodule must be checked out before building:
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
    && pip install --no-cache-dir -r sd-scripts/requirements.txt

# ---------------------------------------------------------------------------
# accelerate — write default config so it doesn't prompt at runtime
# ---------------------------------------------------------------------------
COPY configs/accelerate/runpod.yaml /app/configs/accelerate/runpod.yaml

RUN mkdir -p /root/.cache/huggingface/accelerate \
    && cp /app/configs/accelerate/runpod.yaml \
          /root/.cache/huggingface/accelerate/default_config.yaml

# ---------------------------------------------------------------------------
# Frontend — build React app
# ---------------------------------------------------------------------------
COPY ui/package.json ui/pnpm-lock.yaml ./ui/
RUN cd ui && pnpm install --frozen-lockfile

COPY ui/ ./ui/
RUN cd ui && pnpm build
# Built output lands in ui/dist — NestJS will serve it as static files

# ---------------------------------------------------------------------------
# Backend — build NestJS
# ---------------------------------------------------------------------------
COPY api/package.json api/pnpm-lock.yaml ./api/
RUN cd api && pnpm install --frozen-lockfile

COPY api/ ./api/

# Copy built frontend into NestJS public dir so it's served at /
RUN mkdir -p api/public && cp -r ui/dist/. api/public/

RUN cd api && pnpm build

# ---------------------------------------------------------------------------
# Workspace directories (will be shadowed by volume mounts on RunPod)
# ---------------------------------------------------------------------------
RUN mkdir -p \
    /workspace/models \
    /workspace/datasets \
    /workspace/outputs \
    /workspace/logs \
    /workspace/temp \
    /workspace/gendojo

# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3000

# HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
#     CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["/app/start.sh"]