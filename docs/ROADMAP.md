# Roadmap

## ✅ Done

### Backend

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

### Frontend

- Mantine UI + TanStack Router + TanStack Query + Zustand
- Auth flow — login page, auth guard, token storage
- Datasets page — list, upload via ZIP dropzone, view gallery with lightbox, edit captions with split-pane layout + keyboard navigation
- Jobs page — job list table, new job form, live log streaming via Socket.IO
- Models page — local model browser table
- HuggingFace downloader page
- Settings page — theme toggle, token management (HF + CivitAI), path editor, training constants
- Theme system — dark/light with system preference detection, persisted to localStorage

---

## 🔨 In progress / next up

### Dataset preparation

- [ ] WD14 auto-tagging — run `tag_images_by_wd14_tagger.py` as a managed job, stream results back
- [ ] VLM captioning — OpenAI / Gemini / local Qwen; caption from image + existing tags
- [ ] Bulk caption operations — find/replace across all captions, tag frequency view
- [ ] Masked loss mask editor

### Model management

- [ ] CivitAI downloader page (backend already supports it)
- [ ] LoRA merge UI (`networks/merge_lora.py`)
- [ ] Format conversion — safetensors ↔ ckpt, fp32 → fp16/bf16

### Training

- [ ] Config versioning — every run saves its TOML for reproducibility
- [ ] Sample image preview during training (requires inference pod or local GPU)
- [ ] Live loss curve from TensorBoard event files

### Dataset QA

- [ ] pHash duplicate detection
- [ ] Resolution / bucket distribution preview
- [ ] Token length distribution (truncation audit)
- [ ] Caption format consistency check

### Infrastructure

- [ ] Telegram / Discord webhook notifications on job completion or failure
- [ ] GPU-hours cost estimator

### Evaluation *(via GenUI — separate project)*

- [ ] XYZ plots (LoRA strength × epoch grid)
- [ ] Epoch candidate comparison
- [ ] Showcase generation from trained LoRA