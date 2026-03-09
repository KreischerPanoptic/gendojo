import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { PathsConfig } from '../../config/paths.config';
import { ModelsService } from '../models.service';
import { ARCH_ROLE_DIR } from '../entities/models.constants';
import type { ModelArchitecture, ModelRole } from '../entities/models.types';
import {
  DownloadJob,
  DownloadSource,
  StartDownloadDto,
} from './entities/downloader.types';
import { findPreset, getPresetsByArch } from './presets/download.presets';
import type { ModelPreset } from './entities/downloader.types';

const HF_BASE = 'https://huggingface.co';

@Injectable()
export class DownloaderService implements OnModuleInit {
  private readonly logger = new Logger(DownloaderService.name);

  /** All jobs since process start — never purged (ring-buffer not needed here) */
  private readonly jobs = new Map<string, DownloadJob>();

  /** AbortControllers keyed by job id — for in-flight downloads only */
  private readonly aborts = new Map<string, AbortController>();

  constructor(
    private readonly paths: PathsConfig,
    private readonly modelsService: ModelsService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Nothing to restore — downloads are fire-and-forget; partial files cleaned up.
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Return preset list, optionally filtered by arch */
  listPresets(arch?: string) {
    return getPresetsByArch(arch);
  }

  /** Return all tracked download jobs */
  listJobs(): DownloadJob[] {
    return [...this.jobs.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  getJob(id: string): DownloadJob {
    const job = this.jobs.get(id);
    if (!job) throw new NotFoundException(`Download job not found: ${id}`);
    return job;
  }

  /** Start a new download. Returns the job immediately; download runs in background. */
  async start(dto: StartDownloadDto): Promise<DownloadJob> {
    const resolved = this.resolveDownload(dto);
    const destination = this.resolveDestination(resolved.arch, resolved.role, resolved.filename);

    await fsp.mkdir(path.dirname(destination), { recursive: true });

    const job: DownloadJob = {
      id: randomUUID(),
      source: resolved.source,
      url: resolved.url,
      arch: resolved.arch,
      role: resolved.role,
      filename: resolved.filename,
      destination,
      status: 'pending',
      bytesDownloaded: 0,
      bytesTotal: 0,
      progressPercent: 0,
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);
    this.logger.log(`Download queued [${job.id}] → ${destination}`);

    // Fire-and-forget — client polls for status
    this.runDownload(job).catch(err => {
      this.logger.error(`Download failed [${job.id}]: ${(err as Error).message}`);
    });

    return job;
  }

  /** Cancel a pending or active download */
  cancel(id: string): DownloadJob {
    const job = this.getJob(id);

    if (job.status === 'completed' || job.status === 'failed') {
      throw new BadRequestException(
        `Cannot cancel a ${job.status} download.`,
      );
    }

    this.aborts.get(id)?.abort();
    this.patch(job, { status: 'cancelled', completedAt: new Date() });
    this.logger.log(`Download cancelled [${id}]`);
    return job;
  }

  // ── Resolution helpers ─────────────────────────────────────────────────────

  private resolveDownload(dto: StartDownloadDto): {
    url: string;
    arch: ModelArchitecture;
    role: ModelRole;
    filename: string;
    source: DownloadSource;
  } {
    if (dto.presetId) {
      const preset = findPreset(dto.presetId);
      if (!preset) {
        throw new BadRequestException(`Unknown preset: ${dto.presetId}`);
      }
      return {
        url: this.buildUrl(preset),
        arch: preset.arch,
        role: preset.role,
        filename: preset.filename,
        source: preset.source,
      };
    }

    if (!dto.url || !dto.arch || !dto.role) {
      throw new BadRequestException(
        'Provide either presetId or (url + arch + role).',
      );
    }

    const filename = dto.filename ?? this.filenameFromUrl(dto.url);
    const source = this.detectSource(dto.url);

    return {
      url: this.injectToken(dto.url, source),
      arch: dto.arch,
      role: dto.role,
      filename,
      source,
    };
  }

  private buildUrl(preset: ModelPreset): string {
    if (preset.source === 'huggingface' && preset.hfRepoId && preset.hfFilename) {
      const url = `${HF_BASE}/${preset.hfRepoId}/resolve/main/${preset.hfFilename}`;
      return url; // token goes in the Authorization header, not the URL for HF
    }
    if (preset.directUrl) {
      return this.injectToken(preset.directUrl, preset.source);
    }
    throw new BadRequestException(
      `Preset "${preset.id}" has no resolvable URL.`,
    );
  }

  private injectToken(url: string, source: DownloadSource): string {
    if (source === 'civitai' && process.env.CIVITAI_TOKEN) {
      const u = new URL(url);
      u.searchParams.set('token', process.env.CIVITAI_TOKEN);
      return u.toString();
    }
    return url; // HF token injected as header in runDownload()
  }

  private detectSource(url: string): DownloadSource {
    if (url.includes('huggingface.co')) return 'huggingface';
    if (url.includes('civitai.com')) return 'civitai';
    return 'direct';
  }

  private filenameFromUrl(url: string): string {
    try {
      const u = new URL(url);
      return path.basename(u.pathname) || 'model.safetensors';
    } catch {
      return 'model.safetensors';
    }
  }

  /**
   * Determine where to save the file based on arch + role.
   *
   * Uses ARCH_ROLE_DIR from models.constants (no ModelsService import needed).
   * Falls back to <arch>/ if the role is not mapped.
   */
  private resolveDestination(
    arch: ModelArchitecture,
    role: ModelRole,
    filename: string,
  ): string {
    const dirMap = ARCH_ROLE_DIR[arch] ?? {};
    const subdir = dirMap[role] ?? arch;
    return path.join(this.paths.models, subdir, filename);
  }

  // ── Download execution ─────────────────────────────────────────────────────

  private async runDownload(job: DownloadJob): Promise<void> {
    const abort = new AbortController();
    this.aborts.set(job.id, abort);
    this.patch(job, { status: 'downloading' });

    try {
      await this.fetchToFile(job, abort.signal);

      this.patch(job, {
        status: 'completed',
        progressPercent: 100,
        completedAt: new Date(),
      });

      this.logger.log(
        `Download complete [${job.id}] ${job.filename} (${(job.bytesDownloaded / 1024 / 1024).toFixed(1)} MB)`,
      );

      // Trigger models rescan so the new file appears immediately
      await this.modelsService.refresh();
    } catch (err) {
      const msg = (err as Error).message ?? String(err);

      if (msg === 'CANCELLED') {
        // cancel() already patched status
        return;
      }

      this.patch(job, {
        status: 'failed',
        error: msg,
        completedAt: new Date(),
      });

      // Remove partial file on failure
      await fsp.unlink(job.destination).catch(() => null);
    } finally {
      this.aborts.delete(job.id);
    }
  }

  /**
   * Stream a URL to disk, following up to 10 redirects.
   * Authorization header is added for HuggingFace downloads when HF_TOKEN is set.
   */
  private fetchToFile(
    job: DownloadJob,
    signal: AbortSignal,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        return reject(new Error('CANCELLED'));
      }

      const hfToken = process.env.HF_TOKEN;
      const maxRedirects = 10;

      const follow = (url: string, redirectsLeft: number): void => {
        let parsed: URL;
        try {
          parsed = new URL(url);
        } catch {
          return reject(new Error(`Invalid URL: ${url}`));
        }

        const isHttps = parsed.protocol === 'https:';
        const transport = isHttps ? https : http;

        const headers: Record<string, string> = {
          'User-Agent': 'GenDojo/1.0 (model downloader)',
        };

        if (job.source === 'huggingface' && hfToken) {
          headers['Authorization'] = `Bearer ${hfToken}`;
        }

        const req = transport.get(url, { headers }, (res) => {
          // Follow redirects
          if (
            res.statusCode !== undefined &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            res.resume(); // drain and discard
            if (redirectsLeft === 0) {
              return reject(new Error('Too many redirects'));
            }
            // HF CDN redirects lose auth header — that's intentional
            follow(res.headers.location, redirectsLeft - 1);
            return;
          }

          if (res.statusCode === 401 || res.statusCode === 403) {
            res.resume();
            return reject(
              new Error(
                `HTTP ${res.statusCode}: Access denied. ${job.source === 'huggingface' ? 'Set HF_TOKEN and accept the model license.' : ''}`,
              ),
            );
          }

          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }

          const total = parseInt(res.headers['content-length'] ?? '0', 10);
          this.patch(job, { bytesTotal: total });

          const fileStream = fs.createWriteStream(job.destination);

          // Handle cancellation mid-stream
          const onAbort = () => {
            req.destroy();
            res.destroy();
            fileStream.destroy();
            fsp.unlink(job.destination).catch(() => null);
            reject(new Error('CANCELLED'));
          };
          signal.addEventListener('abort', onAbort, { once: true });

          res.on('data', (chunk: Buffer) => {
            const downloaded = job.bytesDownloaded + chunk.length;
            const percent = total > 0 ? Math.floor((downloaded / total) * 100) : -1;
            this.patch(job, {
              bytesDownloaded: downloaded,
              progressPercent: percent,
            });
          });

          res.pipe(fileStream);

          fileStream.once('finish', () => {
            signal.removeEventListener('abort', onAbort);
            resolve();
          });

          fileStream.once('error', (err) => {
            signal.removeEventListener('abort', onAbort);
            reject(err);
          });

          res.once('error', (err) => {
            signal.removeEventListener('abort', onAbort);
            reject(err);
          });
        });

        req.once('error', reject);
      };

      follow(job.url, maxRedirects);
    });
  }

  // ── Utils ──────────────────────────────────────────────────────────────────

  /** Mutate job in-place; Map entry reflects the change immediately */
  private patch(job: DownloadJob, partial: Partial<DownloadJob>): void {
    Object.assign(job, partial);
  }
}