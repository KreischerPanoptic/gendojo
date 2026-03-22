import { useQuery } from "@tanstack/react-query";
import type { ModelArchitecture } from "@services/models";
import { presetsApi } from "./api";
import { presetsQueryKeys } from "./keys";
import type { PresetTier } from "./types";

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flat list of presets. staleTime=Infinity — system presets never change;
 * user presets are invalidated explicitly after mutations.
 */
export const usePresets = (params?: {
  arch?: ModelArchitecture;
  tier?: PresetTier;
  source?: "system" | "user";
}) =>
  useQuery({
    queryKey: presetsQueryKeys.list(params?.arch, params?.tier, params?.source),
    queryFn: () => presetsApi.list(params),
    staleTime: Infinity,
    throwOnError: false,
  });

// ─────────────────────────────────────────────────────────────────────────────

/** Presets grouped by architecture. Useful for arch-based dropdowns. */
export const usePresetsGrouped = (arch?: ModelArchitecture) =>
  useQuery({
    queryKey: presetsQueryKeys.grouped(arch),
    queryFn: () => presetsApi.grouped({ arch }),
    staleTime: Infinity,
    throwOnError: false,
  });

// ─────────────────────────────────────────────────────────────────────────────

/** Single preset by stable ID. */
export const usePreset = (id: string | null) =>
  useQuery({
    queryKey: presetsQueryKeys.detail(id ?? ""),
    queryFn: () => presetsApi.getOne({ id: id! }),
    enabled: !!id,
    staleTime: Infinity,
    throwOnError: false,
  });
