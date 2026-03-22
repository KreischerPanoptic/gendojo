// ─────────────────────────────────────────────────────────────────────────────
// Create job DTO — two mutually exclusive dataset modes
// ─────────────────────────────────────────────────────────────────────────────

import { TrainTomlDto } from "../../toml/dto/train-toml.dto";
import { DatasetRefOptions, SampleImagesConfig } from "../types/jobs.types";
import { DatasetTomlDto } from "../../toml/dto/dataset-toml.dto";

export type CreateJobDto =
  | {
      train: TrainTomlDto;
      datasetRef: string;
      datasetOptions?: DatasetRefOptions;
      dataset?: never;
      /** Optional sample image configuration — generates preview images during training */
      sampleImages?: SampleImagesConfig;
    }
  | {
      train: TrainTomlDto;
      dataset: DatasetTomlDto;
      datasetRef?: never;
      datasetOptions?: never;
      sampleImages?: SampleImagesConfig;
    };
