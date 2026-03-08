import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { DownloaderService } from './downloader.service';
import { StartDownloadDto } from './entities/downloader.types';

@Controller('downloader')
export class DownloaderController {
  constructor(private readonly downloaderService: DownloaderService) {}

  // ── Presets ────────────────────────────────────────────────────────────────

  /**
   * GET /downloader/presets
   * Returns all built-in model presets grouped by architecture.
   *
   * GET /downloader/presets?arch=flux
   * Returns only presets for the given architecture as a flat array.
   */
  @Get('presets')
  presets(@Query('arch') arch?: string) {
    return this.downloaderService.listPresets(arch);
  }

  // ── Jobs ───────────────────────────────────────────────────────────────────

  /**
   * GET /downloader
   * Returns all download jobs (active + history), newest first.
   */
  @Get()
  list() {
    return this.downloaderService.listJobs();
  }

  /**
   * POST /downloader
   * Start a new download.
   *
   * Option A — preset:
   *   { "presetId": "flux-dev-dit" }
   *
   * Option B — explicit:
   *   {
   *     "url": "https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors",
   *     "arch": "flux",
   *     "role": "dit",
   *     "filename": "flux1-dev.safetensors"   // optional
   *   }
   *
   * Returns the job object immediately; download runs in background.
   * Poll GET /downloader/:id for progress.
   */
  @Post()
  start(@Body() dto: StartDownloadDto) {
    return this.downloaderService.start(dto);
  }

  /**
   * GET /downloader/:id
   * Returns current status and progress of a specific job.
   */
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.downloaderService.getJob(id);
  }

  /**
   * DELETE /downloader/:id
   * Cancel a pending or in-progress download.
   * Already-completed or failed downloads cannot be cancelled (returns 400).
   */
  @Delete(':id')
  cancel(@Param('id') id: string) {
    return this.downloaderService.cancel(id);
  }
}