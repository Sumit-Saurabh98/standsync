import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AppService } from './app.service';
import { QUEUES } from './queues/queue.constants';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectQueue(QUEUES.DEMO) private readonly demoQueue: Queue,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('demo')
  async enqueueDemo() {
    const job = await this.demoQueue.add('say-hello', {
      at: new Date().toISOString(),
    });
    return { enqueued: job.id };
  }
}
