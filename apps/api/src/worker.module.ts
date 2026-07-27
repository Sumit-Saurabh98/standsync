import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { envValidationSchema } from './config/env.validation';
import { QueueRootModule } from './queues/queue-root.module';
import { QUEUES } from './queues/queue.constants';
import { DemoProcessor } from './worker/demo.processor';
import { MailModule } from './mail/mail.module';
import { MailProcessor } from './mail/mail.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    QueueRootModule,
    MailModule,
    BullModule.registerQueue({ name: QUEUES.DEMO }),
    BullModule.registerQueue({ name: QUEUES.MAIL }),
  ],
  providers: [DemoProcessor, MailProcessor],
})
export class WorkerModule {}
