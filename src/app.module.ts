import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { BullModule } from '@nestjs/bullmq';
import { QueueRootModule } from './queues/queue-root.module';
import { QUEUES } from './queues/queue.constants';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        genReqId: (req, res) => {
          const existing = req.headers['x-request-id'] as string | undefined;
          const id = existing ?? randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
        customProps: (req) => ({ requestId: req.id }),
      },
    }),
    QueueRootModule,
    BullModule.registerQueue({ name: QUEUES.DEMO }),
    PrismaModule,
    HealthModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
