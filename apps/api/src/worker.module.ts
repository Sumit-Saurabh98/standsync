import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { envValidationSchema } from './config/env.validation';
import { QueueRootModule } from './queues/queue-root.module';
import { QUEUES } from './queues/queue.constants';
import { DemoProcessor } from './worker/demo.processor';
import { MailModule } from './mail/mail.module';
import { MailProcessor } from './mail/mail.processor';
import { DigestModule } from './modules/digest/digest.module';
import { DigestProcessor } from './modules/digest/digest.processor';
import { PrismaModule } from './prisma/prisma.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { WebhooksProcessor } from './modules/webhooks/webhooks.processor';
import { RemindersModule } from './modules/reminders/reminders.module';
import { RemindersProcessor } from './modules/reminders/reminders.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    QueueRootModule,
    MailModule,
    BullModule.registerQueue({ name: QUEUES.DEMO }),
    BullModule.registerQueue({ name: QUEUES.MAIL }),
    DigestModule,
    BullModule.registerQueue({ name: QUEUES.DIGEST }),
    WebhooksModule,
    BullModule.registerQueue({ name: QUEUES.WEBHOOKS }),
    RemindersModule,
    BullModule.registerQueue({ name: QUEUES.REMINDERS }),
  ],
  providers: [
    DemoProcessor,
    MailProcessor,
    DigestProcessor,
    WebhooksProcessor,
    RemindersProcessor,
  ],
})
export class WorkerModule {}
