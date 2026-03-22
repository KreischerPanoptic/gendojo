import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import * as https from "https";
import * as http from "http";
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";

import { PathsConfig } from "../config/paths.config";
import { ModelsService } from "../models/models.service";
import { ARCH_ROLE_DIR } from "../models/constants/models.constants";
import type {
  ModelArchitecture,
  ModelRole,
} from "../models/types/models.types";
import type { DownloadJob, DownloadSource } from "./types/downloader.types";
import { StartDownloadDto } from "./dto/start-download.dto";
import { findPreset, getPresetsByArch } from "./presets/download.presets";
import type { ModelPreset } from "./types/downloader.types";
import { TokensService } from "../settings/tokens/tokens.service";

const HF_BASE = "https://huggingface.co";

@Injectable()
export class DownloaderService implements OnModuleInit {
  private readonly logger = new Logger(DownloaderService.name);

  /** All jobs since process start — never purged */
  private readonly jobs = new Map<string, DownloadJob>();

  /** AbortControllers keyed by job id — for in-flight downloads only */
  private readonly aborts = new Map<string, AbortController>();

  constructor(
    private readonly paths: PathsConfig,
    private readonly modelsService: ModelsService,
    private readonly tokensService: TokensService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Downloads are fire-and-forget; partial files are cleaned up on failure.
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  listPresets(arch?: string) {
    return getPresetsByArch(arch);
  }

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

  /**
   * Start a new download job.
   *
   * Returns the job immediately; download runs in the background.
   * If the target file already exists at the resolved destination,
   * the job is returned with status='skipped' and no download is performed.
   */
  async start(dto: StartDownloadDto): Promise<DownloadJob> {
    const resolved = this.resolveDownload(dto);
    const destination = this.resolveDestination(resolved);

    await fsp.mkdir(path.dirname(destination), { recursive: true });

    // ── Skip if file already on disk ─────────────────────────────────────────
    if (fs.existsSync(destination)) {
      const skippedJob: DownloadJob = {
        id: randomUUID(),
        source: resolved.source,
        url: resolved.url,
        arch: resolved.arch,
        role: resolved.role,
        filename: resolved.filename,
        destination,
        status: "skipped",
        bytesDownloaded: 0,
        bytesTotal: 0,
        progressPercent: 100,
        alreadyExisted: true,
        createdAt: new Date(),
        completedAt: new Date(),
      };
      this.jobs.set(skippedJob.id, skippedJob);
      this.logger.log(
        `Skipped [${skippedJob.id}] — file already exists: ${destination}`,
      );
      return skippedJob;
    }

    const job: DownloadJob = {
      id: randomUUID(),
      source: resolved.source,
      url: resolved.url,
      arch: resolved.arch,
      role: resolved.role,
      filename: resolved.filename,
      destination,
      status: "pending",
      bytesDownloaded: 0,
      bytesTotal: 0,
      progressPercent: 0,
      alreadyExisted: false,
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);
    this.logger.log(`Download queued [${job.id}] → ${destination}`);

    // Fire-and-forget — client polls GET /downloader/:id for progress
    this.runDownload(job).catch((err) => {
      this.logger.error(
        `Download failed [${job.id}]: ${(err as Error).message}`,
      );
    });

    return job;
  }

  /** Cancel a pending or active download */
  cancel(id: string): DownloadJob {
    const job = this.getJob(id);

    if (
      job.status === "completed" ||
      job.status === "failed" ||
      job.status === "skipped"
    ) {
      throw new BadRequestException(`Cannot cancel a ${job.status} download.`);
    }

    this.aborts.get(id)?.abort();
    this.patch(job, { status: "cancelled", completedAt: new Date() });
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
    preset?: ModelPreset;
  } {
    if (dto.presetId) {
      const preset = findPreset(dto.presetId);
      if (!preset) {
        throw new BadRequestException(`Unknown preset: "${dto.presetId}"`);
      }
      return {
        url: this.buildPresetUrl(preset),
        arch: preset.arch,
        role: preset.role,
        filename: preset.filename,
        source: preset.source,
        preset,
      };
    }

    if (!dto.url || !dto.arch || !dto.role) {
      throw new BadRequestException(
        "Provide either presetId or (url + arch + role).",
      );
    }

    return {
      url: dto.url,
      arch: dto.arch,
      role: dto.role,
      filename: dto.filename ?? this.filenameFromUrl(dto.url),
      source: this.detectSource(dto.url),
    };
  }

  /**
   * Resolve the absolute destination path.
   *
   * Priority:
   *   1. `preset.sharedDestination` — overrides everything; saves to
   *      models/<sharedDestination> regardless of arch+role.
   *   2. ARCH_ROLE_DIR mapping — normal arch+role → subdirectory lookup.
   *   3. Fallback — models/<arch>/<filename>.
   */
  private resolveDestination(resolved: {
    arch: ModelArchitecture;
    role: ModelRole;
    filename: string;
    preset?: ModelPreset;
  }): string {
    if (resolved.preset?.sharedDestination) {
      return path.join(this.paths.models, resolved.preset.sharedDestination);
    }

    const dirMap = ARCH_ROLE_DIR[resolved.arch] ?? {};
    const subdir = dirMap[resolved.role] ?? resolved.arch;
    return path.join(this.paths.models, subdir, resolved.filename);
  }

  private buildPresetUrl(preset: ModelPreset): string {
    if (
      preset.source === "huggingface" &&
      preset.hfRepoId &&
      preset.hfFilename
    ) {
      // HF token goes in the Authorization header, not the URL
      return `${HF_BASE}/${preset.hfRepoId}/resolve/main/${preset.hfFilename}`;
    }
    if (preset.directUrl) {
      return preset.directUrl;
    }
    throw new BadRequestException(
      `Preset "${preset.id}" has no resolvable URL.`,
    );
  }

  private detectSource(url: string): DownloadSource {
    if (url.includes("huggingface.co")) return "huggingface";
    if (url.includes("civitai.com")) return "civitai";
    return "direct";
  }

  private filenameFromUrl(url: string): string {
    try {
      return path.basename(new URL(url).pathname) || "model.safetensors";
    } catch {
      return "model.safetensors";
    }
  }

  // ── Download execution ─────────────────────────────────────────────────────

  private async runDownload(job: DownloadJob): Promise<void> {
    const abort = new AbortController();
    this.aborts.set(job.id, abort);
    this.patch(job, { status: "downloading" });

    try {
      await this.fetchToFile(job, abort.signal);

      this.patch(job, {
        status: "completed",
        progressPercent: 100,
        completedAt: new Date(),
      });

      this.logger.log(
        `Download complete [${job.id}] ${job.filename} ` +
          `(${(job.bytesDownloaded / 1024 / 1024).toFixed(1)} MB)`,
      );

      // Trigger model rescan so the new file appears in GET /models immediately
      await this.modelsService.refresh();
    } catch (err) {
      const msg = (err as Error).message ?? String(err);

      if (msg === "CANCELLED") {
        // cancel() already patched the status
        return;
      }

      this.patch(job, {
        status: "failed",
        error: msg,
        completedAt: new Date(),
      });

      // Clean up partial file on failure
      await fsp.unlink(job.destination).catch(() => null);
    } finally {
      this.aborts.delete(job.id);
    }
  }

  /**
   * Stream a URL to disk, following up to 10 redirects.
   * HuggingFace and CivitAI tokens are sent in the Authorization header.
   * CDN redirect responses intentionally drop the auth header.
   */
  private fetchToFile(job: DownloadJob, signal: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (signal.aborted) return reject(new Error("CANCELLED"));

      const hfToken = this.tokensService.getToken("hfToken");
      const civitaiToken = this.tokensService.getToken("civitaiToken");

      const follow = (url: string, redirectsLeft: number): void => {
        let parsed: URL;
        try {
          parsed = new URL(url);
        } catch {
          return reject(new Error(`Invalid URL: ${url}`));
        }

        const transport = parsed.protocol === "https:" ? https : http;

        const headers: Record<string, string> = {
          "User-Agent": "GenDojo/1.0 (model downloader)",
        };

        if (job.source === "huggingface" && hfToken) {
          headers["Authorization"] = `Bearer ${hfToken}`;
        }
        if (job.source === "civitai" && civitaiToken) {
          headers["Authorization"] = `Bearer ${civitaiToken}`;
        }

        const req = transport.get(url, { headers }, (res) => {
          // Follow redirects (auth header intentionally dropped on CDN hops)
          if (
            res.statusCode !== undefined &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            res.resume();
            if (redirectsLeft === 0)
              return reject(new Error("Too many redirects"));
            follow(res.headers.location, redirectsLeft - 1);
            return;
          }

          if (res.statusCode === 401 || res.statusCode === 403) {
            res.resume();
            return reject(
              new Error(
                `HTTP ${res.statusCode}: Access denied.${job.source === "huggingface" ? " Set HF_TOKEN and accept the model license on HuggingFace." : ""}`,
              ),
            );
          }

          if (res.statusCode !== 200) {
            res.resume();
            return reject(
              new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`),
            );
          }

          const total = parseInt(res.headers["content-length"] ?? "0", 10);
          this.patch(job, { bytesTotal: total });

          const fileStream = fs.createWriteStream(job.destination);

          const onAbort = () => {
            req.destroy();
            res.destroy();
            fileStream.destroy();
            fsp.unlink(job.destination).catch(() => null);
            reject(new Error("CANCELLED"));
          };
          signal.addEventListener("abort", onAbort, { once: true });

          res.on("data", (chunk: Buffer) => {
            const downloaded = job.bytesDownloaded + chunk.length;
            const percent =
              total > 0 ? Math.floor((downloaded / total) * 100) : -1;
            this.patch(job, {
              bytesDownloaded: downloaded,
              progressPercent: percent,
            });
          });

          res.pipe(fileStream);

          fileStream.once("finish", () => {
            signal.removeEventListener("abort", onAbort);
            resolve();
          });
          fileStream.once("error", (err) => {
            signal.removeEventListener("abort", onAbort);
            reject(err);
          });
          res.once("error", (err) => {
            signal.removeEventListener("abort", onAbort);
            reject(err);
          });
        });

        req.once("error", reject);
      };

      follow(job.url, 10);
    });
  }

  // ── Utils ──────────────────────────────────────────────────────────────────

  /** Mutate job in-place — Map entry reflects the change immediately */
  private patch(job: DownloadJob, partial: Partial<DownloadJob>): void {
    Object.assign(job, partial);
  }
}
