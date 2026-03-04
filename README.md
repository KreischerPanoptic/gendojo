# GenDojo

> A self-hosted web workbench for LoRA training with [kohya-ss/sd-scripts](https://github.com/kohya-ss/sd-scripts).  
> Built to run on RunPod (or any CUDA machine) via Docker — no more wrestling with web terminals.

## What it does

- Configure and launch LoRA training jobs through a proper web UI (no Gradio)
- Live log streaming and training progress in the browser
- Browse local models and datasets
- GPU / system stats at a glance
- Manage training presets per architecture

## Supported architectures

Via sd-scripts submodule:

| Architecture | LoRA | DreamBooth | Fine-tune |
|---|---|---|---|
| SD 1.x / 2.x | ✓ | ✓ | ✓ |
| SDXL | ✓ | ✓ | ✓ |
| FLUX.1 | ✓ | ✓ | — |
| SD3 / SD3.5 | ✓ | ✓ | ✓ |
| Anima | ✓ | — | — |
| Lumina | ✓ | — | ✓ |
| HunyuanImage | ✓ | — | — |

## Stack

| Layer | Tech |
|---|---|
| Backend | NestJS (Node.js) |
| Frontend | React + Vite + Mantine UI |
| Routing | TanStack Router |
| Server state | TanStack Query |
| Real-time | Socket.IO (WebSocket) |
| Training | kohya-ss/sd-scripts (git submodule) |

## Project structure

```
gendojo/
├── api/            # NestJS backend
├── ui/             # React frontend
├── sd-scripts/     # kohya-ss/sd-scripts (submodule)
├── config_files/   # accelerate configs
├── models/         # base models (persisted to /workspace on RunPod)
├── datasets/       # training datasets
├── outputs/        # trained LoRAs
└── docs/
```

## Quick start (Docker / RunPod)

```bash
# Clone with submodule
git clone --recurse-submodules https://github.com/yourname/gendojo.git

# Build
docker build -t gendojo .

# Run locally
docker run --gpus all -p 3000:3000 \
  -v $(pwd)/models:/workspace/models \
  -v $(pwd)/datasets:/workspace/datasets \
  -v $(pwd)/outputs:/workspace/outputs \
  gendojo
```

On RunPod — set port `3000` as HTTP in your pod template. The UI will be available at `https://[pod-id]-3000.proxy.runpod.net`.

## Development

```bash
# Backend
cd api && pnpm install && pnpm run start:dev

# Frontend
cd ui && pnpm install && pnpm run dev
```

Requires Node.js 20+, pnpm, Python 3.11+, CUDA 12.x.

## License

MIT