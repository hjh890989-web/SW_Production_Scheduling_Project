import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig, type Role } from '@/auth.config';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';

export { ROLES } from '@/auth.config';
export type { Role };

/**
 * 로그인 이벤트 audit 최소 기록 (T1.1).
 * 전체 logAudit(IP/sessionId/fallback)는 T1.6에서 lib/audit.ts로 일반화한다.
 */
async function writeLoginAudit(
  userId: string | null,
  action: 'LOGIN' | 'LOGIN_FAILED',
  ipAddress: string | null,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { userId, action, targetTable: 'User', targetKey: userId, ipAddress },
    });
  } catch (err) {
    // audit 실패가 인증 흐름을 차단하지 않도록 fallback (T1.6에서 강화)
    console.error('[audit] writeLoginAudit failed:', err);
  }
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

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          // 실패 카운터 +1 (5회 잠금 enforcement는 T1.5에서 강화)
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLogins: { increment: 1 } },
          });
          await writeLoginAudit(user.id, 'LOGIN_FAILED', ip);
          return null;
        }

        // 성공: 실패 카운터 리셋 + lastLoginAt 갱신
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
        });
        await writeLoginAudit(user.id, 'LOGIN', ip);

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
