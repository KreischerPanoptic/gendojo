import type { TrainConfig, FullDatasetDto } from "@services/jobs";
import type {
  DatasetTomlPreviewResponseDto,
  TrainTomlPreviewResponseDto,
  ValidationResultDto,
} from "./types";
import {
  tomlControllerPreviewDataset,
  tomlControllerPreviewTrain,
  tomlControllerValidateTrain,
} from "@api/sdk.gen";

export const tomlApi = {
  /**
   * POST /toml/preview/dataset
   * Generate dataset.toml string from a DatasetTomlDto.
   * Returns { toml: string }.
   */
  previewDataset: (
    body: FullDatasetDto,
  ): Promise<DatasetTomlPreviewResponseDto> =>
    tomlControllerPreviewDataset({ body }).then((r) => {
      if (!r.data) throw new Error(`Can't preview dataset TOML.`);
      return r.data;
    }),

  /**
   * POST /toml/preview/train
   * Validate + generate train.toml string.
   * Returns 422 on validation failure (displayed in preview pane, not thrown).
   */
  previewTrain: (body: TrainConfig): Promise<TrainTomlPreviewResponseDto> =>
    tomlControllerPreviewTrain({ body }).then((r) => {
      if (!r.data) throw new Error(`Can't preview training TOML.`);
      return r.data;
    }),

  /**
   * POST /toml/validate/train
   * Validate only — no TOML generated.
   * Always returns 200; check `valid` field.
   */
  validateTrain: (body: TrainConfig): Promise<ValidationResultDto> =>
    tomlControllerValidateTrain({ body }).then((r) => {
      if (!r.data) throw new Error(`Can't validate training TOML.`);
      return r.data;
    }),
};
