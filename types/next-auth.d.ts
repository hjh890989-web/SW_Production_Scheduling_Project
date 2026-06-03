import type { DefaultSession } from 'next-auth';
import type { Role } from '@/auth.config';

declare module 'next-auth' {
  interface User {
    role?: Role;
    sessionVersion?: number;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role?: Role;
    sv?: number; // SEC: 발급 시점 User.sessionVersion (무효화 비교용)
  }
}
