import { Module } from '@nestjs/common';
import { OutputsController } from './outputs.controller';
import { OutputsService } from './outputs.service';
import { JobsModule } from '../jobs.module';

/**
 * OutputsModule — job output artifact scanning and file serving.
 *
 * Depends on JobsModule to get job records (outputDir, samplePromptsPath).
 * Registered in AppModule separately from JobsModule to keep concerns clean.
 *
 * Routes provided (all under /jobs/:id/outputs):
 *   GET /jobs/:id/outputs
 *   GET /jobs/:id/outputs/previews/:filename
 *   GET /jobs/:id/outputs/download/:filename
 */
@Module({
  imports: [JobsModule],       // provides JobsService via exports
  controllers: [OutputsController],
  providers: [OutputsService],
})
export class OutputsModule {}