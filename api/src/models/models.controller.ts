import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  NotFoundException,
} from "@nestjs/common";
import { ModelsService } from "./models.service";
import type {
  ModelArchitecture,
  ModelType,
  ModelRole,
} from "./entities/models.types";
import { ALL_ARCHITECTURES, ALL_ROLES, ALL_TYPES, ARCH_ROLES } from "./entities/models.constants";

@Controller("models")
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  /**
   * GET /models
   * GET /models?arch=flux
   * GET /models?type=text_encoder
   * GET /models?role=clip_l
   * GET /models?arch=flux&role=dit
   */
  @Get()
  list(
    @Query("arch") arch?: ModelArchitecture,
    @Query("type") type?: ModelType,
    @Query("role") role?: ModelRole,
  ) {
    return this.modelsService.list({ arch, type, role });
  }

  /**
   * GET /models/options
   * Returns options derived from files currently on disk.
   *
   * GET /models/options?option=arch   → { architectures: [...] }
   * GET /models/options?option=type   → { types: [...] }
   * GET /models/options?option=role   → { roles: [...] }
   * GET /models/options               → { architectures, types, roles }
   */
  @Get("options")
  options(@Query("option") option?: "arch" | "type" | "role") {
    return this.modelsService.options(option);
  }

  /**
   * GET /models/options/all
   * Returns the full static list of every valid architecture / role / type
   * the application supports — regardless of what is currently on disk.
   *
   * Used by the downloader and any UI that needs to enumerate choices
   * before a model is actually present in the workspace.
   *
   * Optional query params narrow the response:
   *   ?option=arch  → { architectures }
   *   ?option=type  → { types }
   *   ?option=role  → { roles }
   *   ?arch=flux    → { roles: [...roles valid for flux...] }
   */
  @Get("options/all")
  allOptions(
    @Query("option") option?: "arch" | "type" | "role",
    @Query("arch") arch?: ModelArchitecture,
  ) {
    // If arch is specified, return only the roles valid for that architecture
    if (arch && arch !== "unknown") {
      return { roles: ARCH_ROLES[arch] ?? [] };
    }

    if (option === "arch") return { architectures: ALL_ARCHITECTURES };
    if (option === "type") return { types: ALL_TYPES };
    if (option === "role") return { roles: ALL_ROLES };

    return {
      architectures: ALL_ARCHITECTURES,
      types: ALL_TYPES,
      roles: ALL_ROLES,
    };
  }

  /** POST /models/refresh — re-scan disk and rebuild cache */
  @Post("refresh")
  async refresh() {
    const models = await this.modelsService.refresh();
    return { count: models.length };
  }

  /** GET /models/flux%2Fclip_l.safetensors  (id is URL-encoded relative path) */
  @Get("*path")
  getOne(@Param("0") id: string) {
    // ← '0', не 'id'
    const model = this.modelsService.getById(id);
    if (!model) throw new NotFoundException(`Model not found: ${id}`);
    return model;
  }
}
