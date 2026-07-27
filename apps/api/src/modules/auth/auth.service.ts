import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { randomUUID, randomBytes, createHash } from 'crypto';
import { OAuthProfile } from './oauth-profile.type';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from '../../queues/queue.constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    @InjectQueue(QUEUES.MAIL) private readonly mailQueue: Queue,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'An account with this email already exists.',
      });
    }

    const rounds = this.config.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = await this.prisma.user.create({
      data: { name: dto.name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    try {
      await this.sendEmailVerification(user.id, user.email);
    } catch (err) {
      this.logger.error('Failed to send verification email', err as Error);
    }

    return user;
  }

  private durationToMs(value: string): number {
    const match = /^(\d+)\s*([smhd])$/.exec(value.trim());
    if (!match) {
      throw new Error(`Invalid duration: ${value}`);
    }
    const amount = Number(match[1]);
    const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]]!;
    return amount * unit;
  }

  private async sendEmailVerification(userId: string, email: string) {
    const rawToken = randomBytes(32).toString('hex');
    const expiresIn = this.config.getOrThrow<string>(
      'EMAIL_VERIFICATION_EXPIRES_IN',
    );
    const expiresAt = new Date(Date.now() + this.durationToMs(expiresIn));

    await this.prisma.emailVerification.create({
      data: { userId, tokenHash: this.hashToken(rawToken), expiresAt },
    });

    const link = `${this.config.getOrThrow<string>('WEB_ORIGIN')}/verify-email?token=${rawToken}`;
    await this.enqueueMail(
      email,
      'Verify your StandSync email',
      `<p>Welcome to StandSync! Confirm your email:</p>
       <p><a href="${link}">${link}</a></p>
       <p>This link expires in ${expiresIn}.</p>`,
    );
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user.isEmailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before signing in.',
      });
    }
    const tokens = await this.issueTokens(user.id, user.email);
    return {
      ...tokens,
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN'),
    };
  }

  async handleOAuthLogin(profile: OAuthProfile) {
    if (!profile.email) {
      throw new BadRequestException({
        code: 'OAUTH_EMAIL_MISSING',
        message:
          'Your provider did not share an email. Make your email public and try again.',
      });
    }

    // 1. Already linked → log that user in.
    const account = await this.prisma.authAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      },
      include: { user: true },
    });

    if (account) {
      return this.issueTokens(account.user.id, account.user.email);
    }

    // 2. Email already belongs to a different method → no silent linking.
    const existingUser = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });
    if (existingUser) {
      throw new ConflictException({
        code: 'OAUTH_EMAIL_EXISTS_OTHER_PROVIDER',
        message:
          'An account with this email already exists. Sign in with your existing method.',
      });
    }

    // 3. New user → create verified user + linked provider account.
    const user = await this.prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        isEmailVerified: true,
        authAccounts: {
          create: {
            provider: profile.provider,
            providerAccountId: profile.providerAccountId,
            email: profile.email,
          },
        },
      },
    });

    return this.issueTokens(user.id, user.email);
  }

  private async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }
    return user;
  }

  private async signAccessToken(userId: string, email: string) {
    return this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.getOrThrow<string>(
          'JWT_ACCESS_EXPIRES_IN',
        ) as JwtSignOptions['expiresIn'],
      },
    );
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueTokens(userId: string, email: string, familyId?: string) {
    const fam = familyId ?? randomUUID();
    const accessToken = await this.signAccessToken(userId, email);
    const { token: refreshToken } = await this.signRefreshToken(userId, fam);
    return { accessToken, refreshToken };
  }

  private async signRefreshToken(userId: string, familyId: string) {
    const token = await this.jwt.signAsync(
      { sub: userId, familyId, jti: randomUUID() },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.getOrThrow<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as JwtSignOptions['expiresIn'],
      },
    );

    const { exp } = this.jwt.decode<{ exp: number }>(token);

    const row = await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(exp * 1000),
      },
      select: { id: true },
    });

    return { token, id: row.id };
  }

  private async verifyRefreshToken(token: string) {
    try {
      return await this.jwt.verifyAsync<{ sub: string; familyId: string }>(
        token,
        { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') },
      );
    } catch {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_INVALID',
        message: 'invalid session',
      });
    }
  }

  async rotateRefreshToken(rawToken: string) {
    await this.verifyRefreshToken(rawToken); // signature + expiry
    const tokenHash = this.hashToken(rawToken);

    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existing) {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_INVALID',
        message: 'Invalid session.',
      });
    }

    // Reuse of an already-rotated token → revoke the whole family.

    if (existing.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_REUSE_DETECTED',
        message: 'Session revoked. Please log in again.',
      });
    }

    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_INVALID',
        message: 'Session expired.',
      });
    }

    const user = await this.prisma.user.findFirst({
      where: { id: existing.userId, deletedAt: null },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_INVALID',
        message: 'Invalid session.',
      });
    }

    // Rotate: issue new refresh in the same family, revoke + link the old one.

    const { token: newRefresh, id: newId } = await this.signRefreshToken(
      user.id,
      existing.familyId,
    );

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedBy: newId },
    });

    const accessToken = await this.signAccessToken(user.id, user.email);

    return {
      accessToken,
      refreshToken: newRefresh,
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN'),
    };
  }

  async logout(rawToken?: string) {
    if (!rawToken) return;
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
    });
    if (existing) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  async verifyEmail(rawToken: string) {
    const record = await this.prisma.emailVerification.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException({
        code: 'EMAIL_VERIFICATION_INVALID',
        message: 'Verification link is invalid or expired.',
      });
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { isEmailVerified: true },
      }),

      this.prisma.emailVerification.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { verified: true };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always respond the same way — don't reveal whether the email exists
    // or is already verified.

    if (user && !user.isEmailVerified) {
      try {
        await this.sendEmailVerification(user.id, user.email);
      } catch (error) {
        this.logger.error(
          'Failed to resend verification email',
          error as Error,
        );
      }
    }
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Only password accounts can reset; stay enumeration-safe otherwise.

    if (user && user.passwordHash) {
      const rawToken = randomBytes(32).toString('hex');
      const expiresIn = this.config.getOrThrow<string>(
        'PASSWORD_RESET_EXPIRES_IN',
      );

      const expiresAt = new Date(Date.now() + this.durationToMs(expiresIn));

      await this.prisma.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(rawToken),
          expiresAt,
        },
      });

      const link = `${this.config.getOrThrow<string>('WEB_ORIGIN')}/reset-password?token=${rawToken}`;

      try {
        await this.enqueueMail(
          user.email,
          'Reset your StandSync password',
          `<p>Reset your password:</p>
           <p><a href="${link}">${link}</a></p>
           <p>This link expires in ${expiresIn}. If you didn't request this, ignore it.</p>`,
        );
      } catch (err) {
        this.logger.error('Failed to send password reset email', err as Error);
      }
    }
    // Always the same response regardless of outcome.
  }

  async resetPassword(rawToken: string, newPassword: string) {
    const record = await this.prisma.passwordReset.findFirst({
      where: { tokenHash: this.hashToken(rawToken) },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException({
        code: 'PASSWORD_RESET_INVALID',
        message: 'Reset link is invalid or expired.',
      });
    }

    const rounds = this.config.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const passwordHash = await bcrypt.hash(newPassword, rounds);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordReset.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Security: revoke all sessions so a leaked old session can't survive a reset.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { reset: true };
  }

  private enqueueMail(to: string, subject: string, html: string) {
    return this.mailQueue.add('send', { to, subject, html });
  }
}
