import { AuthProvider } from '../../generated/prisma/enums';

export interface OAuthProfile {
  provider: AuthProvider;
  providerAccountId: string;
  email?: string;
  name: string;
  avatarUrl?: string;
}
