// ─────────────────────────────────────────────────────────────────────────────
// Create job DTO — two mutually exclusive dataset modes
// ─────────────────────────────────────────────────────────────────────────────

import { TrainTomlDto } from "src/toml/dto/train-toml.dto";
import { DatasetRefOptions, SampleImagesConfig } from "../types/jobs.types";
import { DatasetTomlDto } from "src/toml/dto/dataset-toml.dto";

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