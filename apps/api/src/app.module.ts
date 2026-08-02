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
import { MailModule } from './mail/mail.module';
import { ThrottlerModule, ThrottlerGuard, seconds } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { TeamsModule } from './modules/teams/teams.module';
import { StandupsModule } from './modules/standups/standups.module';
import { DigestModule } from './modules/digest/digest.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: seconds(config.get<number>('THROTTLE_TTL', 60)),
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: config.getOrThrow<string>('REDIS_HOST'),
            port: config.getOrThrow<number>('REDIS_PORT'),
            password: config.get<string>('REDIS_PASSWORD') || undefined,
          }),
        ),
      }),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        // In dev, only log failed/slow requests — keeps SchedulerService lines visible.
        customLogLevel: (_req, res, err) => {
          if (err || res.statusCode >= 400) return 'warn';
          return 'silent';
        },
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
    TeamsModule,
    StandupsModule,
    DigestModule,
    SchedulerModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
