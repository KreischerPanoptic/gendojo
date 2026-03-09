# GenDojo

> A self-hosted training workbench for diffusion model fine-tuning.  
> Built on [kohya-ss/sd-scripts](https://github.com/kohya-ss/sd-scripts). Runs on RunPod via Docker — no Gradio, no web terminal wrestling.

The goal is a single tool you never have to leave — from raw images to trained LoRA.

---

## Supported architectures

| Architecture | Training script |
|---|---|
| SD 1.x / 2.x | `train_network.py` |
| SDXL | `sdxl_train_network.py` |
| FLUX.1 | `flux_train_network.py` |
| SD3 / SD3.5 | `sd3_train_network.py` |
| HunyuanImage | `hunyuan_image_train_network.py` |
| Lumina | `lumina_train_network.py` |
| Anima | `anima_train_network.py` |
| Chroma | `flux_train_network.py` |

---

## Stack

| Layer | Tech |
|---|---|
| Backend | NestJS 11 (TypeScript) |
| Frontend | React + Vite + Mantine UI |
| Routing | TanStack Router |
| Server state | TanStack Query |
| Real-time | Socket.IO |
| Package manager | pnpm |
| Training engine | kohya-ss/sd-scripts (git submodule) |
| Deploy | Docker → RunPod (CUDA 12.x) |

---

## Quick start

```bash
git clone --recurse-submodules https://github.com/KreischerPanoptic/gendojo.git
docker build -t gendojo .
docker run --gpus all -p 3000:3000 \
  -v $(pwd)/models:/app/models \
  -v $(pwd)/datasets:/app/datasets \
  -v $(pwd)/outputs:/app/outputs \
  gendojo
```

On RunPod — set port `3000` as HTTP in your pod template.  
UI available at `https://[pod-id]-3000.proxy.runpod.net`.

**Default credentials:** `admin` / `gendojo`

---

## Docs

- [Roadmap](docs/ROADMAP.md)
- [Architecture & project structure](docs/ARCHITECTURE.md)
- [Development setup](docs/DEVELOPMENT.md)

---

## GenUI

Inference and evaluation live in a separate project: **GenUI** — a NestJS API layer over ComfyUI with a proper web interface. GenDojo and GenUI can run as separate RunPod pods sharing a network volume, or independently.

---

## License

MIT