import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUES } from '../../queues/queue.constants';
import { createReadStream } from 'fs';
import { constants } from 'fs';
import { access, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { buildStandupsCsv } from './standups-csv.util';

type ExportJobRecord = {
  id: string;
  teamId: string;
  userId: string;
  format: string;
  status: string;
  team?: { name: string } | null;
  filePath?: string | null;
  fileName?: string | null;
  completedAt?: Date | null;
  lastError?: string | null;
  createdAt?: Date;
};

type ExportJobDelegate = {
  create(args: {
    data: {
      teamId: string;
      userId: string;
      format: string;
      status: string;
    };
  }): Promise<ExportJobRecord>;
  findUnique(args: {
    where: { id: string };
    include: { team: { select: { name: true } } };
  }): Promise<ExportJobRecord | null>;
  update(args: {
    where: { id: string };
    data: {
      status: string;
      filePath?: string;
      fileName?: string;
      completedAt?: Date | null;
      lastError?: string | null;
    };
  }): Promise<unknown>;
  findFirst(args: {
    where: { id: string; teamId: string };
  }): Promise<ExportJobRecord | null>;
};

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.REPORTS) private readonly reportsQueue: Queue,
  ) {}

  async enqueue(teamId: string, userId: string, format: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
    });

    if (!team) {
      throw new NotFoundException({
        code: 'TEAM_NOT_FOUND',
        message: 'Team not found.',
      });
    }

    if (format !== 'CSV') {
      throw new UnprocessableEntityException({
        code: 'EXPORT_FORMAT_UNSUPPORTED',
        message: 'Only CSV export is supported for now.',
      });
    }

    const exportJobClient = this.prisma
      .exportJob as unknown as ExportJobDelegate;
    const job = await exportJobClient.create({
      data: {
        teamId,
        userId,
        format,
        status: 'PENDING',
      },
    });

    await this.reportsQueue.add('generate', { exportJobId: job.id });

    return {
      jobId: job.id,
      status: job.status,
      format: job.format,
    };
  }

  async process(exportJobId: string): Promise<void> {
    const exportJobClient = this.prisma
      .exportJob as unknown as ExportJobDelegate;
    const exportJob = await exportJobClient.findUnique({
      where: { id: exportJobId },
      include: { team: { select: { name: true } } },
    });

    if (!exportJob || exportJob.status !== 'PENDING') {
      return;
    }

    await exportJobClient.update({
      where: { id: exportJobId },
      data: { status: 'PROCESSING' },
    });

    try {
      const standups = await this.prisma.standup.findMany({
        where: { teamId: exportJob.teamId, deletedAt: null },
        orderBy: [{ standupDate: 'desc' }, { submittedAt: 'desc' }],
        select: {
          standupDate: true,
          yesterday: true,
          today: true,
          blockers: true,
          isLate: true,
          submittedAt: true,
          user: { select: { name: true, email: true } },
        },
      });

      const csv = buildStandupsCsv(standups);
      const dir = join(process.cwd(), 'storage', 'exports');
      await mkdir(dir, { recursive: true });

      const teamName = exportJob.team?.name ?? 'team';
      const slug = teamName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const fileName = `standups-${slug || 'team'}-${exportJob.id}.csv`;
      const filePath = join(dir, fileName);

      await writeFile(filePath, csv, 'utf8');

      await exportJobClient.update({
        where: { id: exportJobId },
        data: {
          status: 'COMPLETED',
          filePath,
          fileName,
          completedAt: new Date(),
          lastError: null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      await exportJobClient.update({
        where: { id: exportJobId },
        data: {
          status: 'FAILED',
          lastError: message.slice(0, 500),
        },
      });

      throw err;
    }
  }

  async getJob(teamId: string, jobId: string) {
    const exportJobClient = this.prisma
      .exportJob as unknown as ExportJobDelegate;
    const job = await exportJobClient.findFirst({
      where: { id: jobId, teamId },
    });

    if (!job) {
      throw new NotFoundException({
        code: 'EXPORT_JOB_NOT_FOUND',
        message: 'Export job not found.',
      });
    }

    const downloadUrl =
      job.status === 'COMPLETED' && job.fileName
        ? `/api/v1/teams/${teamId}/reports/export/${jobId}/download`
        : null;

    return {
      jobId: job.id,
      status: job.status,
      format: job.format,
      fileName: job.fileName ?? null,
      downloadUrl,
      lastError: job.lastError ?? null,
      createdAt: job.createdAt,
      completedAt: job.completedAt ?? null,
    };
  }

  async getDownload(teamId: string, jobId: string) {
    const exportJobClient = this.prisma
      .exportJob as unknown as ExportJobDelegate;
    const job = await exportJobClient.findFirst({
      where: { id: jobId, teamId },
    });

    if (!job || job.status !== 'COMPLETED' || !job.filePath || !job.fileName) {
      throw new NotFoundException({
        code: 'EXPORT_FILE_NOT_READY',
        message: 'Export file is not ready for download.',
      });
    }

    try {
      await access(job.filePath, constants.R_OK);
    } catch {
      throw new NotFoundException({
        code: 'EXPORT_FILE_MISSING',
        message: 'Export file is no longer available.',
      });
    }

    return {
      stream: createReadStream(job.filePath),
      fileName: job.fileName,
    };
  }
}
