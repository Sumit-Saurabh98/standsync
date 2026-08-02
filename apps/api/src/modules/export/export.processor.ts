import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '../../queues/queue.constants';
import { ExportService } from './export.service';

export interface ExportJobData {
  exportJobId: string;
}

@Processor(QUEUES.REPORTS)
export class ExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportProcessor.name);

  constructor(private readonly exportService: ExportService) {
    super();
  }

  async process(job: Job<ExportJobData>): Promise<void> {
    await this.exportService.process(job.data.exportJobId);
    this.logger.log(`Export job ${job.id} → ${job.data.exportJobId} done`);
  }
}
