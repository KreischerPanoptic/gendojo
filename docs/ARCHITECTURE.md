# Architecture

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

## Key design decisions

**Single-GPU enforcement** — `MAX_CONCURRENT_JOBS=1` is hardcoded for RunPod single-GPU pods. The jobs queue is intentional, not a limitation.

**Static constants vs. live service data** — architectural metadata (valid archs, roles, directory mappings) lives in `models.constants.ts`. Dynamic data (what's actually on disk) lives in `ModelsService`. These are kept strictly separate to avoid circular dependencies when `DownloaderService` triggers `ModelsService.refresh()` after a download completes.

**Settings at runtime** — `SettingsService` merges env var defaults with a persisted `settings.json`. Live getters are used throughout so path/constant changes apply to the next job without a restart. Settings that affect multer initialization or JWT security remain env-only and are not exposed via the settings UI.

**TOML generation** — `TrainTomlDto` is a discriminated union across 9 architectures. Architecture-specific constraints (e.g. Chroma requires `guidance_scale=0.0`, HunyuanImage always requires `network_train_unet_only=true`) are enforced at validation time before any file is written.

## RunPod volume layout

```
/workspace/
├── gendojo/
│   └── settings.json
├── models/
│   ├── flux/
│   ├── sdxl/
│   ├── sd/
│   └── ...
├── datasets/
└── outputs/
```