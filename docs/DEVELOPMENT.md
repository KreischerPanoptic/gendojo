# Development

## Requirements

- Node.js 20+
- pnpm
- Python 3.11+
- CUDA 12.x (GPU optional for local dev — hardware metrics degrade gracefully)

## Local setup

```bash
git clone --recurse-submodules https://github.com/KreischerPanoptic/gendojo.git
```

**Backend**
```bash
cd api
pnpm install
pnpm run start:dev
```

**Frontend**
```bash
cd ui
pnpm install
pnpm run dev
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `AUTH_SECRET` | — | Required in production. Omit to enable dev-mode bypass |
| `AUTH_TOKEN_EXPIRES` | `7d` | Token expiry. Env-only, not exposed in settings UI |
| `AUTH_USERNAME` | `admin` | Required in production. Omit to enable dev-mode bypass |
| `AUTH_PASSWORD` | `gendojo` | Required in production. Omit to enable dev-mode bypass |
| `MODELS_PATH` | `/workspace/models` | Override default model volume path |
| `DATASETS_PATH` | `/workspace/datasets` | Override default dataset volume path |\
| `OUTPUTS_PATH` | `/workspace/outputs` | Override default outputs path |
| `LOGS_PATH` | `/workspace/logs` | Override default logs volume path |
| `TEMP_PATH` | `/workspace/temp` | Override default temp volume path |
| `SETTINGS_PATH` | `/workspace/gendojo/settings.json` | Override default settings.json path |
| `HF_TOKEN` | — | HuggingFace token (can also be set via Settings UI) |
| `CIVITAI_TOKEN` | — | CivitAI token (can also be set via Settings UI) |

## Docker

```bash
docker build -t gendojo .
docker run --gpus all -p 3000:3000 \
  -v $(pwd)/models:/workspace/models \
  -v $(pwd)/datasets:/workspace/datasets \
  -v $(pwd)/outputs:/workspace/outputs \
  gendojo
```

## Notes

- Windows dev environment: paths use `\\` separators internally, normalized at the service boundary
- `sd-scripts` is a git submodule — always clone with `--recurse-submodules`
- accelerate configs live in `configs/accelerate/` — the RunPod config sets `num_processes=1` and the correct mixed precision defaults