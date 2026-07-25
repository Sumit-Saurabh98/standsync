import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { envValidationSchema } from './config/env.validation';
import { QueueRootModule } from './queues/queue-root.module';
import { QUEUES } from './queues/queue.constants';
import { DemoProcessor } from './worker/demo.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    QueueRootModule,
    BullModule.registerQueue({ name: QUEUES.DEMO }),
  ],
  providers: [DemoProcessor],
})
export class WorkerModule {}
