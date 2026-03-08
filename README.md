# GenDojo

> A self-hosted training workbench for diffusion model fine-tuning.  
> Built on [kohya-ss/sd-scripts](https://github.com/kohya-ss/sd-scripts). Runs on RunPod via Docker — no Gradio, no web terminal wrestling.

The goal is a single tool you never have to leave — from raw images to trained LoRA.

---

## Roadmap

### ✅ Done

**Backend**
- JWT auth with `APP_GUARD`, `@SkipAuth()` decorator, dev-mode bypass when env vars are absent
- `@Global() ConfigModule` — central `PathsConfig` backed by `SettingsService` for live path resolution
- `SettingsService` — merges env var defaults with persisted `settings.json` at `/workspace/gendojo/settings.json`; settings controller with full GET/PUT API
- `TokensService` — stores HuggingFace and CivitAI tokens on disk; tokens are masked in all API responses (set flag + last-4 hint only)
- `ModelsService` — scans model volumes with two-pass arch+role classification via ordered regex rules; `ARCH_ROLE_DIR` mapping for known subdirectory layouts
- `DatasetsModule` — full REST API: ZIP upload with automatic single-folder flattening, caption upsert, caption coverage stats, path traversal protection
- `DownloaderService` — downloads from HuggingFace (with `HF_TOKEN` auth header) and CivitAI (with token query param); progress tracking, cancellation, redirect following, model preset catalog, triggers `ModelsService.refresh()` on completion
- `JobsService` — spawns `accelerate launch` processes, ring buffer with disk persistence, tqdm carriage-return stderr handling, `MAX_CONCURRENT_JOBS=1` enforcement
- `JobsGateway` — Socket.IO gateway on `/jobs` namespace with room-based log streaming and history replay on reconnect
- `SystemModule` — hardware metrics polling: GPU via `nvidia-smi`, CPU via `/proc/stat`, RAM via `/proc/meminfo`, disk via `df -B1`; graceful fallbacks for Windows dev
- TOML generation — `DatasetTomlDto`, `TrainTomlDto` (discriminated union across 9 architectures), `ARCH_META` table, custom TOML serializer, architecture-specific constraint validation at request time

**Frontend**
- Mantine UI + TanStack Router + TanStack Query + Zustand
- Auth flow — login page, auth guard, token storage
- Datasets page — list, upload via ZIP dropzone, view gallery with lightbox, edit captions with split-pane layout + keyboard navigation
- Jobs page — job list table, new job form, live log streaming via Socket.IO
- Models page — local model browser table
- HuggingFace downloader page
- Settings page — theme toggle, token management (HF + CivitAI), path editor, training constants
- Theme system — dark/light with system preference detection, persisted to localStorage

---

### 🔨 In progress / next up

**Dataset preparation**
- [ ] WD14 auto-tagging — run `tag_images_by_wd14_tagger.py` as a managed job, stream results back
- [ ] VLM captioning — OpenAI / Gemini / local Qwen; caption from image + existing tags
- [ ] Bulk caption operations — find/replace across all captions, tag frequency view
- [ ] Masked loss mask editor

**Model management**
- [ ] CivitAI downloader page (backend already supports it)
- [ ] LoRA merge UI (sd-scripts `networks/merge_lora.py`)
- [ ] Format conversion — safetensors ↔ ckpt, fp32 → fp16/bf16

**Training**
- [ ] Config versioning — every run saves its TOML for reproducibility
- [ ] Sample image preview during training (requires inference pod or local GPU)
- [ ] Live loss curve from TensorBoard event files

**Dataset QA**
- [ ] pHash duplicate detection
- [ ] Resolution / bucket distribution preview
- [ ] Token length distribution (truncation audit)
- [ ] Caption format consistency check

**Infrastructure**
- [ ] Telegram / Discord webhook notifications on job completion or failure
- [ ] GPU-hours cost estimator

**Evaluation** *(via GenUI — separate project)*
- [ ] XYZ plots (LoRA strength × epoch grid)
- [ ] Epoch candidate comparison
- [ ] Showcase generation from trained LoRA

---

## Supported architectures

| Architecture | Training script | LoRA | DreamBooth | Fine-tune | TI |
|---|---|---|---|---|---|
| SD 1.x / 2.x | `train_network.py` | ✓ | ✓ | ✓ | ✓ |
| SDXL | `sdxl_train_network.py` | ✓ | ✓ | ✓ | ✓ |
| FLUX.1 | `flux_train_network.py` | ✓ | ✓ | ✓ | — |
| SD3 / SD3.5 | `sd3_train_network.py` | ✓ | ✓ | ✓ | — |
| HunyuanImage | `hunyuan_image_train_network.py` | ✓ | — | — | — |
| Lumina | `lumina_train_network.py` | ✓ | ✓ | ✓ | — |
| Anima | `anima_train_network.py` | ✓ | ✓ | ✓ | — |
| Chroma | `flux_train_network.py` | ✓ | — | — | — |

---

## GenUI

Inference and visual evaluation live in a separate project: **GenUI** — an independent NestJS API layer over ComfyUI with a proper web interface. GenDojo calls GenUI for anything that needs a GPU doing inference rather than training. The two can run as separate RunPod pods sharing a network volume, or independently.

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

## Project structure

```
gendojo/
├── api/
│   └── src/
│       ├── auth/           # JWT auth, guards, decorators
│       ├── config/         # PathsConfig — central path resolver
│       ├── datasets/       # Dataset management + ZIP upload
│       ├── downloader/     # Model download from HF and CivitAI
│       ├── jobs/           # Training job runner + Socket.IO gateway
│       ├── models/         # Model scanner + classification
│       ├── system/
│       │   ├── settings/   # Persistent settings (paths, training constants)
│       │   └── ...         # Hardware metrics
│       ├── tokens/         # API token storage (masked responses)
│       └── toml/           # TOML generation for dataset + training configs
├── ui/
│   └── src/
│       ├── pages/          # Route pages
│       ├── services/       # API clients + TanStack Query hooks
│       ├── stores/         # Zustand stores (auth, theme, navigation)
│       ├── components/     # Reusable UI components
│       ├── layouts/        # Layout components (header, sidebar, grids)
│       └── routes/         # TanStack Router route tree
├── sd-scripts/             # kohya-ss/sd-scripts (git submodule)
├── configs/
│   └── accelerate/         # accelerate launch configs (default + runpod)
├── models/                 # → /workspace/models on RunPod
├── datasets/               # → /workspace/datasets on RunPod
├── outputs/                # → /workspace/outputs on RunPod
└── docs/
```

---

## Quick start (Docker / RunPod)

```bash
git clone --recurse-submodules https://github.com/KreischerPanoptic/gendojo.git

docker build -t gendojo .

docker run --gpus all -p 3000:3000 \
  -v $(pwd)/models:/app/models \
  -v $(pwd)/datasets:/app/datasets \
  -v $(pwd)/outputs:/app/outputs \
  -v $(pwd)/logs:/app/outlogsputs \
  gendojo
```

On RunPod — set port `3000` as HTTP in your pod template. The UI will be available at `https://[pod-id]-3000.proxy.runpod.net`.

---

## Development

```bash
# Backend
cd api && pnpm install && pnpm run start:dev

# Frontend
cd ui && pnpm install && pnpm run dev
```

Requires Node.js 20+, pnpm, Python 3.11+, CUDA 12.x (GPU optional for local dev — hardware metrics degrade gracefully).

---

## License

MIT