import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/auth.config';
import { hasPermission } from '@/lib/permissions';
import { requiredPermission } from '@/lib/route-permissions';
import { buildCsp } from '@/lib/security/headers';

// Edge Runtime: authConfig + 순수 RBAC 매트릭스(lib/permissions) + 무의존 CSP 빌더만 사용 — Node 의존 없음.
const { auth } = NextAuth(authConfig);

// 인증 없이 접근 가능한 경로(여기에도 CSP는 적용한다).
const PUBLIC_PATHS = ['/login', '/forbidden', '/offline'];
function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default auth((req) => {
  const { pathname, search, origin } = req.nextUrl;
  const session = req.auth;

  // SEC: per-request nonce → CSP에서 script-src 'unsafe-inline' 제거(XSS 방어).
  const nonce = btoa(crypto.randomUUID());
  // dev는 React 디버깅(eval)·HMR이 CSP에 막히지 않도록 미적용. prod에서만 엄격 적용(E2E는 prod 대상이라 CSP 검증 유지).
  const csp = process.env.NODE_ENV === 'production' ? buildCsp(nonce) : null;
  // Next가 요청 헤더의 CSP에서 nonce를 읽어 부트스트랩 <script>에 nonce를 부여한다.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  if (csp) requestHeaders.set('content-security-policy', csp);

  const withCsp = (res: NextResponse): NextResponse => {
    if (csp) res.headers.set('content-security-policy', csp);
    return res;
  };

  if (!isPublic(pathname)) {
    // 1) 미인증 → /login?callbackUrl= (원래 경로 보존)
    if (!session?.user) {
      const url = new URL('/login', origin);
      url.searchParams.set('callbackUrl', `${pathname}${search}`);
      return withCsp(NextResponse.redirect(url));
    }
    // 2) 페이지별 RBAC — 권한 미충족 → /forbidden (audit는 forbidden 서버 컴포넌트에서 기록)
    const permission = requiredPermission(pathname);
    if (permission && !hasPermission(session.user, permission)) {
      const url = new URL('/forbidden', origin);
      url.searchParams.set('from', pathname);
      return withCsp(NextResponse.redirect(url));
    }
  }

  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
});

export const config = {
  // 정적 자원·api·sw·manifest·이미지(public 로고 등)는 제외(인증·nonce 불필요). login/forbidden/offline은 포함해 CSP를 적용.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)'],
};
