import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

// Edge Runtime: Node 의존(Prisma·bcrypt) 없는 authConfig만 사용한다.
// 인증 가드·페이지별 RBAC 로직은 T1.3에서 추가한다.
const { auth } = NextAuth(authConfig);

export default auth((_req) => {
  return undefined;
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)'],
};
