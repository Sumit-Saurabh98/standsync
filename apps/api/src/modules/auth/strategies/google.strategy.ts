import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { AuthProvider } from '../../../generated/prisma/enums';
import { OAuthProfile } from '../oauth-profile.type';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const user: OAuthProfile = {
      provider: AuthProvider.GOOGLE,
      providerAccountId: profile.id,
      email: profile.emails?.[0]?.value?.toLowerCase(),
      name: profile.displayName || profile.username || 'Google User',
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, user);
  }
}
