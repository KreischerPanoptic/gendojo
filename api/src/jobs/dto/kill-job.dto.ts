import { JobStatus } from "../types/jobs.types";

export interface KillJobDto {
    killed: boolean;
    status: JobStatus | undefined;
}