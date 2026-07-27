import {
  Body,
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
  Req,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OAuthProfile } from './oauth-profile.type';
import { Throttle, seconds } from '@nestjs/throttler';

@Throttle({ default: { limit: 10, ttl: seconds(60) } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(this.config.getOrThrow<string>('REFRESH_COOKIE_NAME'), token, {
      httpOnly: true,
      secure: this.config.get<boolean>('COOKIE_SECURE'),
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(this.config.getOrThrow<string>('REFRESH_COOKIE_NAME'), {
      httpOnly: true,
      secure: this.config.get<boolean>('COOKIE_SECURE'),
      sameSite: 'lax',
      path: '/api/v1/auth',
    });
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, expiresIn } =
      await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, expiresIn };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieName = this.config.getOrThrow<string>('REFRESH_COOKIE_NAME');
    const cookies = req.cookies as Record<string, string | undefined>;
    const token = cookies?.[cookieName];
    if (!token) {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_INVALID',
        message: 'Missing session.',
      });
    }
    const { accessToken, refreshToken, expiresIn } =
      await this.authService.rotateRefreshToken(token);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, expiresIn };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieName = this.config.getOrThrow<string>('REFRESH_COOKIE_NAME');
    const cookies = req.cookies as Record<string, string | undefined>;
    await this.authService.logout(cookies?.[cookieName]);
    this.clearRefreshCookie(res);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('verify-email/resend')
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerification(dto.email);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  // --- Social login (OAuth) ---

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // AuthGuard redirects to Google's consent screen.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    await this.handleOAuthRedirect(req, res);
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubAuth() {
    // AuthGuard redirects to GitHub's consent screen.
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    await this.handleOAuthRedirect(req, res);
  }

  private async handleOAuthRedirect(req: Request, res: Response) {
    const webOrigin = this.config.getOrThrow<string>('WEB_ORIGIN');
    try {
      const profile = req.user as OAuthProfile;
      const { accessToken, refreshToken } =
        await this.authService.handleOAuthLogin(profile);
      this.setRefreshCookie(res, refreshToken);
      const redirect = this.config.getOrThrow<string>('OAUTH_SUCCESS_REDIRECT');
      res.redirect(`${redirect}/oauth/callback#accessToken=${accessToken}`);
    } catch (err) {
      const code =
        err instanceof HttpException
          ? (() => {
              const response = err.getResponse();
              if (
                typeof response === 'object' &&
                response !== null &&
                'code' in response &&
                typeof response.code === 'string'
              ) {
                return response.code;
              }
              return 'OAUTH_FAILED';
            })()
          : 'OAUTH_FAILED';
      res.redirect(`${webOrigin}/login?error=${code}`);
    }
  }
}
