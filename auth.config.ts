import type { NextAuthConfig } from 'next-auth';

/**
 * 6 Role (CORE-1: Stage_D 이슈 명세 기준 UPPER_SNAKE 페르소나 매핑).
 * - ADMIN: 시스템 관리자
 * - PRODUCTION_MANAGER: 생산관리 (김민수)
 * - MOLDING_LEADER: 성형 반장 (박철수)
 * - EXTRUSION_LEADER: 압출 반장 (이영호)
 * - SALES_PURCHASE: 영업·구매 (정수진)
 * - EXECUTIVE: 경영진 (KPI 열람)
 */
export const ROLES = [
  'ADMIN',
  'PRODUCTION_MANAGER',
  'MOLDING_LEADER',
  'EXTRUSION_LEADER',
  'SALES_PURCHASE',
  'EXECUTIVE',
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Edge Runtime 호환 기본 설정 (CORE-2: Credentials provider 제약으로 JWT 전략).
 * Credentials provider와 Prisma·bcrypt 의존(Node 전용)은 auth.ts에서 추가한다.
 * middleware.ts는 이 설정만 import 하여 Edge 번들에 Node 의존성이 섞이지 않게 한다.
 */
export const authConfig = {
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8h idle timeout
  trustHost: true,
  pages: { signIn: '/login' },
  providers: [], // 실제 Credentials provider는 auth.ts(Node)에서 주입
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.mustChangePassword = (token as { mcp?: boolean }).mcp ?? false;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
