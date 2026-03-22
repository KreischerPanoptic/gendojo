import { useMutation, useQueryClient } from "@tanstack/react-query";
import { presetsApi } from "./api";
import { presetsQueryKeys } from "./keys";
import type {
  PresetsControllerCreateData,
  PresetsControllerDeleteData,
  PresetsControllerUpdateData,
  TrainingPresetDto,
} from "@api/types.gen";

// ─────────────────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────────────────

export const useCreatePreset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: PresetsControllerCreateData["body"]) =>
      presetsApi.create(body),
    onSuccess: (created: TrainingPresetDto) => {
      queryClient.setQueryData(presetsQueryKeys.detail(created.id), created);
      void queryClient.invalidateQueries({ queryKey: presetsQueryKeys.all });
    },
    onError: (err) => console.error("[Presets] Create failed:", err),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────────────────────

export const useUpdatePreset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: {
      path: PresetsControllerUpdateData["path"];
      body: PresetsControllerUpdateData["body"];
    }) => presetsApi.update(request.path, request.body),
    onSuccess: (updated: TrainingPresetDto) => {
      queryClient.setQueryData(presetsQueryKeys.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: presetsQueryKeys.all });
    },
    onError: (err) => console.error("[Presets] Update failed:", err),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────────────────────

export const useDeletePreset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (path: PresetsControllerDeleteData["path"]) =>
      presetsApi.delete(path),
    onSuccess: (_data, path) => {
      queryClient.removeQueries({ queryKey: presetsQueryKeys.detail(path.id) });
      void queryClient.invalidateQueries({ queryKey: presetsQueryKeys.all });
    },
    onError: (err) => console.error("[Presets] Delete failed:", err),
  });
};
