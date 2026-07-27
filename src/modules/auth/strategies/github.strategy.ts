import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { AuthProvider } from '../../../generated/prisma/enums';
import { OAuthProfile } from '../oauth-profile.type';

// Minimal shape of what we read from the GitHub profile.
interface GithubProfile {
  id: string | number;
  displayName?: string;
  username?: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
}

type DoneCallback = (err: Error | null, user?: OAuthProfile) => void;

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('GITHUB_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GithubProfile,
    done: DoneCallback,
  ): void {
    const user: OAuthProfile = {
      provider: AuthProvider.GITHUB,
      providerAccountId: String(profile.id),
      email: profile.emails?.[0]?.value?.toLowerCase(),
      name: profile.displayName || profile.username || 'GitHub User',
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, user);
  }
}
