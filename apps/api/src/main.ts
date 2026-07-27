import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.use(cookieParser());
  app.useLogger(app.get(Logger));
  const config = app.get(ConfigService);
  app.enableCors({
    origin: config.get<string>('WEB_ORIGIN'),
    credentials: true,
  });

  // All routes are prefixed with /api/v1, except /health (used by probes).
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  // Validate & sanitize every incoming request against its DTO.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // Let Nest run lifecycle hooks (e.g. Prisma disconnect, BullMQ drain) on SIGTERM.
  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 3000);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('StandSync API')
    .setDescription('Automated daily standups for engineering teams')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
}
bootstrap();
