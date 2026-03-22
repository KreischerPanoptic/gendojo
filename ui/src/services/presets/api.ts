import {
  presetsControllerCreate,
  presetsControllerDelete,
  presetsControllerGetOne,
  presetsControllerGrouped,
  presetsControllerList,
  presetsControllerUpdate,
} from "@api/sdk.gen";
import type {
  PresetsControllerCreateData,
  PresetsControllerGetOneData,
  PresetsControllerGroupedData,
  PresetsControllerGroupedResponse,
  PresetsControllerListData,
  PresetsControllerUpdateData,
  TrainingPresetDto,
} from "@api/types.gen";

export const presetsApi = {
  /**
   * GET /presets
   * GET /presets?arch=flux
   * GET /presets?arch=flux&tier=balanced
   * GET /presets?source=user
   */
  list: (
    query?: PresetsControllerListData["query"],
  ): Promise<TrainingPresetDto[]> =>
    presetsControllerList({ query }).then((r) => {
      return r.data ? (r.data.presets ?? []) : [];
    }),

  /**
   * GET /presets/grouped
   * GET /presets/grouped?arch=flux
   */
  grouped: (
    query: PresetsControllerGroupedData["query"],
  ): Promise<PresetsControllerGroupedResponse["grouped"]> =>
    presetsControllerGrouped({ query }).then((r) => {
      return r.data?.grouped;
    }),

  /** GET /presets/:id */
  getOne: (
    path: PresetsControllerGetOneData["path"],
  ): Promise<TrainingPresetDto> =>
    presetsControllerGetOne({ path }).then((r) => {
      if (!r.data) throw new Error(`Can't get preset.`);
      return r.data;
    }),

  /** POST /presets → 201 */
  create: (
    body: PresetsControllerCreateData["body"],
  ): Promise<TrainingPresetDto> =>
    presetsControllerCreate({ body }).then((r) => {
      if (!r.data) throw new Error(`Can't create preset.`);
      return r.data;
    }),

  /** PUT /presets/:id → 200. Returns 422 for system presets. */
  update: (
    path: PresetsControllerUpdateData["path"],
    body: PresetsControllerUpdateData["body"],
  ): Promise<TrainingPresetDto> =>
    presetsControllerUpdate({ path, body }).then((r) => {
      if (!r.data) throw new Error(`Can't update preset.`);
      return r.data;
    }),

  /** DELETE /presets/:id → 204. Returns 422 for system presets. */
  delete: (path: PresetsControllerUpdateData["path"]): Promise<void> =>
    presetsControllerDelete({ path }).then(),
};
