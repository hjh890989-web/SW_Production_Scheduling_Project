import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig, type Role } from '@/auth.config';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { isLocked, registerFailure } from '@/lib/auth/lockout';
import { logAudit } from '@/lib/audit';

export { ROLES } from '@/auth.config';
export type { Role };

/** 로그인 이벤트 audit 기록 (T1.6 logAudit 일반화 사용). */
function writeLoginAudit(
  userId: string | null,
  action: 'LOGIN' | 'LOGIN_FAILED',
  ipAddress: string | null,
  userRole?: string | null,
): Promise<void> {
  return logAudit({ userId, userRole, action, table: 'User', key: userId, ipAddress });
}

function extractIp(request: Request | undefined): string | null {
  if (!request) return null;
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    null
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: '아이디', type: 'text' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials, request) {
        const username = typeof credentials?.username === 'string' ? credentials.username.trim() : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';
        const ip = extractIp(request);

        if (!username || !password) return null;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
          await writeLoginAudit(null, 'LOGIN_FAILED', ip);
          return null;
        }

        const now = new Date();

        // 계정 잠금 상태면 비밀번호 확인 없이 차단 (T1.5)
        if (isLocked(user.lockedUntil, now)) {
          await writeLoginAudit(user.id, 'LOGIN_FAILED', ip);
          return null;
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          // 실패 카운터 +1, 5회 도달 시 5분 잠금 (T1.5)
          const { failedLogins, lockedUntil } = registerFailure(user.failedLogins, now);
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLogins, lockedUntil },
          });
          await writeLoginAudit(user.id, 'LOGIN_FAILED', ip);
          return null;
        }

        // 성공: 실패 카운터·잠금 리셋 + lastLoginAt 갱신 (AC T1.5-2 자동 해제)
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLogins: 0, lockedUntil: null, lastLoginAt: now },
        });
        await writeLoginAudit(user.id, 'LOGIN', ip, user.role);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as Role,
        };
      },
    }),
  ],
});
