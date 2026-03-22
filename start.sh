#!/bin/bash
# =============================================================================
# GenDojo — container entrypoint
# Runs inside Docker on RunPod (and locally).
# =============================================================================

set -euo pipefail

echo "=============================="
echo " GenDojo starting..."
echo "=============================="

# ---------------------------------------------------------------------------
# 1. Workspace directories (no-op if already mounted as volumes)
# ---------------------------------------------------------------------------
mkdir -p \
    "${MODELS_PATH:-/workspace/models}" \
    "${DATASETS_PATH:-/workspace/datasets}" \
    "${OUTPUTS_PATH:-/workspace/outputs}" \
    "${LOGS_PATH:-/workspace/logs}" \
    "${TEMP_PATH:-/workspace/temp}" \
    /workspace/gendojo

# ---------------------------------------------------------------------------
# 2. accelerate config
#    Copy the bundled runpod.yaml into the location accelerate expects.
#    This runs every start so env-var changes take effect without rebuilding.
# ---------------------------------------------------------------------------
ACCELERATE_CONFIG="${ACCELERATE_CONFIG_PATH:-/app/configs/accelerate/runpod.yaml}"

if [ -f "$ACCELERATE_CONFIG" ]; then
    mkdir -p /root/.cache/huggingface/accelerate
    cp "$ACCELERATE_CONFIG" /root/.cache/huggingface/accelerate/default_config.yaml
    echo "[accelerate] Config loaded from $ACCELERATE_CONFIG"
else
    echo "[accelerate] WARNING: config not found at $ACCELERATE_CONFIG — accelerate will use its defaults"
fi

# ---------------------------------------------------------------------------
# 3. GPU check (informational only — don't fail if no GPU in dev)
# ---------------------------------------------------------------------------
if command -v nvidia-smi &>/dev/null; then
    echo ""
    nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader
    echo ""
else
    echo "[gpu] nvidia-smi not found — running without GPU (dev mode)"
fi

# ---------------------------------------------------------------------------
# 4. Python / sd-scripts sanity check
# ---------------------------------------------------------------------------
SDSCRIPTS="${SD_SCRIPTS_PATH:-/app/sd-scripts}"
if [ -f "$SDSCRIPTS/train_network.py" ]; then
    echo "[sd-scripts] Found at $SDSCRIPTS"
else
    echo "[sd-scripts] WARNING: train_network.py not found at $SDSCRIPTS"
    echo "             Did you forget --recurse-submodules when cloning?"
fi

# ---------------------------------------------------------------------------
# 5. Start NestJS
# ---------------------------------------------------------------------------
echo ""
echo "[api] Starting NestJS on port 3000..."
echo ""

cd /app/api
exec bun run dist/main.js