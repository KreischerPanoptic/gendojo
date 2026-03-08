# GenDojo

> A self-hosted training workbench for diffusion model fine-tuning.  
> Built on [kohya-ss/sd-scripts](https://github.com/kohya-ss/sd-scripts). Runs on RunPod via Docker — no Gradio, no web terminal wrestling.

The goal is a single tool you never have to leave — from raw images to trained LoRA.

## Current scope

The first milestone is a clean, minimal training UI:

- Configure and launch LoRA training jobs through a proper web interface
- Live log streaming and training progress in the browser
- Browse local models and datasets
- GPU / system stats at a glance
- Training presets per architecture, stored as versioned TOML configs

## Planned pipeline stages

As the project matures, GenDojo will grow to cover the full fine-tuning workflow:

**Dataset preparation**
- Image upscaling (Real-ESRGAN and similar)
- Smart / face-aware cropping before bucketing
- WD14 auto-tagging
- VLM captioning (OpenAI / Gemini / local) from image + tag list
- Caption editing UI — bulk find/replace, visual tag↔text editor
- Mask editor for masked loss training

**Dataset analytics & QA**
- pHash duplicate detection
- Activation token audit
- Caption format consistency check (tags vs natural language mix)
- Resolution and size audit
- Tag frequency distribution
- Bucket distribution preview for a given resolution
- Token length distribution (how many captions will be truncated)

**Model management**
- Model download from HuggingFace and CivitAI
- LoRA merge and weighted mixing
- LoRA bake-in to base checkpoint
- Format conversion (safetensors ↔ ckpt, fp32 → fp16/bf16)

**Training**
- BullMQ job queue with scheduling
- Config versioning — every run saves its TOML for reproducibility
- Experiment tracker — compare runs by hyperparameters and metrics
- Live loss curve and sample image preview during training

**Evaluation** *(API-first, UI later)*
- XYZ plots (LoRA strength × epoch grid) via [GenUI](#genui)
- Showcase generation from trained LoRA
- Epoch candidate comparison

**Infrastructure**
- Telegram / Discord webhook notifications on run completion or failure
- GPU-hours cost estimator

## GenUI

Inference and visual evaluation live in a separate project: **GenUI** — an independent NestJS API layer over ComfyUI with a proper web interface. GenDojo calls GenUI for anything that needs a GPU doing inference rather than training. The two can run as separate RunPod pods sharing a network volume, or independently.

## Supported architectures

| Architecture | LoRA | DreamBooth | Fine-tune | Textual Inversion |
|---|---|---|---|---|
| SD 1.x / 2.x | ✓ | ✓ | ✓ | ✓ |
| SDXL | ✓ | ✓ | ✓ | ✓ |
| FLUX.1 | ✓ | ✓ | ✓ | — |
| SD3 / SD3.5 | ✓ | ✓ | ✓ | — |
| Anima | ✓ | ✓ | ✓ | — |
| Lumina | ✓ | ✓ | ✓ | — |
| HunyuanImage | ✓ | — | — | — |

## Stack

| Layer | Tech |
|---|---|
| Backend | NestJS (Node.js / TypeScript) |
| Frontend | React + Vite + Mantine UI |
| Routing | TanStack Router |
| Server state | TanStack Query |
| Real-time | Socket.IO (WebSocket) |
| Job queue | BullMQ |
| Package manager | pnpm |
| Training engine | kohya-ss/sd-scripts (git submodule) |
| Deploy | Docker → RunPod (CUDA 12.x) |

## Project structure

```
gendojo/
├── api/            # NestJS backend
├── ui/             # React frontend
├── sd-scripts/     # kohya-ss/sd-scripts (submodule)
├── config_files/   # accelerate configs
├── models/         # base models  → /workspace/models on RunPod
├── datasets/       # training data → /workspace/datasets on RunPod
├── outputs/        # trained LoRAs → /workspace/outputs on RunPod
└── docs/
```

## Quick start (Docker / RunPod)

```bash
git clone --recurse-submodules https://github.com/yourname/gendojo.git

docker build -t gendojo .

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