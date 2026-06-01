import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/auth.config';
import { hasPermission } from '@/lib/permissions';
import { requiredPermission } from '@/lib/route-permissions';

// Edge Runtime: authConfig + 순수 RBAC 매트릭스(lib/permissions)만 사용 — Node 의존 없음 (T1.3 제약).
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const session = req.auth;

  // 1) 미인증 → /login?callbackUrl= (원래 경로 보존)
  if (!session?.user) {
    const url = new URL('/login', req.nextUrl.origin);
    url.searchParams.set('callbackUrl', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // 2) 페이지별 RBAC — 권한 미충족 → /forbidden (audit는 forbidden 서버 컴포넌트에서 기록)
  const permission = requiredPermission(pathname);
  if (permission && !hasPermission(session.user, permission)) {
    const url = new URL('/forbidden', req.nextUrl.origin);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  // api(자체 가드)·정적 자원·login·forbidden 은 미들웨어 가드에서 제외
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|forbidden).*)'],
};
