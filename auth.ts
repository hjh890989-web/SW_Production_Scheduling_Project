import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig, type Role } from '@/auth.config';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { isLocked, registerFailure } from '@/lib/auth/lockout';
import { isSessionRevoked } from '@/lib/auth/session-revocation';
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
          sessionVersion: user.sessionVersion,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Node 전용 jwt: 로그인 시 sessionVersion 저장 + 후속 요청마다 DB값과 비교해 무효화(SEC).
    // 미들웨어(Edge)는 authConfig.callbacks를 쓰므로 미적용 — 페이지/서버액션(Node)에서 강제된다.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: Role }).role;
        token.sv = (user as { sessionVersion?: number }).sessionVersion ?? 0;
        token.mcp = (user as { mustChangePassword?: boolean }).mustChangePassword ?? false;
        return token;
      }
      const tokenId = token.id as string | undefined;
      if (tokenId) {
        try {
          const u = await prisma.user.findUnique({
            where: { id: tokenId },
            select: { sessionVersion: true },
          });
          if (isSessionRevoked(token.sv as number | undefined, u?.sessionVersion)) {
            // 무효화: 신원·표시정보 제거 → 권한 없는 익명 세션이 되어 보호 자원 접근/변경 차단
            return { ...token, id: '', role: undefined, name: null, email: null, sv: -1 };
          }
        } catch {
          // SEC: DB 오류 시 fail-open(전체 잠금 방지) — 다음 요청에서 재검증
        }
      }
      return token;
    },
  },
});
