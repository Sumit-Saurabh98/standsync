import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { randomUUID, createHash } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
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

    return this.prisma.user.create({
      data: { name: dto.name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    const tokens = await this.issueTokens(user.id, user.email);
    return {
      ...tokens,
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN'),
    };
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

  private async singleRefreshToken(userId: string, familyId: string) {
    const token = await this.jwt.signAsync(
      { sub: userId, familyId },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.getOrThrow<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as JwtSignOptions['expiresIn'],
      },
    );

    const { exp } = this.jwt.decode<{ exp: number }>(token);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(exp * 1000),
      },
    });

    return token;
  }

  private async issueTokens(userId: string, email: string, familyId?: string) {
    const fam = familyId ?? randomUUID();
    const accessToken = await this.signAccessToken(userId, email);
    const { token: refreshToken } = await this.signRefreshToken(userId, fam);
    return { accessToken, refreshToken };
  }

  private async signRefreshToken(userId: string, familyId: string) {
    const token = await this.jwt.signAsync(
      { sub: userId, familyId },
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
}
