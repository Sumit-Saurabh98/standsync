import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_SALT_ROUNDS: Joi.number().default(12),
  WEB_ORIGIN: Joi.string().default('http://localhost:3001'),
  REFRESH_COOKIE_NAME: Joi.string().default('standsync_rt'),
  COOKIE_SECURE: Joi.boolean().default(false),
  APP_URL: Joi.string().default('http://localhost:3000'),
  GMAIL_USER: Joi.string().optional(),
  GMAIL_APP_PASSWORD: Joi.string().optional(),
  MAIL_FROM: Joi.string().optional(),
  EMAIL_VERIFICATION_EXPIRES_IN: Joi.string().default('24h'),
  PASSWORD_RESET_EXPIRES_IN: Joi.string().default('1h'),
});
