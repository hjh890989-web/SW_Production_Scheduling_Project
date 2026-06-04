import type { DefaultSession } from 'next-auth';
import type { Role } from '@/auth.config';

declare module 'next-auth' {
  interface User {
    role?: Role;
    sessionVersion?: number;
    mustChangePassword?: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      mustChangePassword?: boolean;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role?: Role;
    sv?: number; // SEC: 발급 시점 User.sessionVersion (무효화 비교용)
    mcp?: boolean; // 초기 PIN 강제 변경 필요(mustChangePassword)
  }
}
