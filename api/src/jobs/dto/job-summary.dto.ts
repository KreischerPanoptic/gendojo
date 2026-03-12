import { Job } from "../entities/job.entity";

export type JobSummaryDto = Omit<Job, 'command' | 'script'>;