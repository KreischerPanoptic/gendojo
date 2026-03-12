import { Job } from "../entities/job.entity";
import { LogLine } from "../types/jobs.types";

export interface JobDetailDto extends Job {
  logBuffer?: LogLine[]; // Буфер подмешиваем только для живых задач
}