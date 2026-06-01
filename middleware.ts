import { auth } from '@/auth';

export default auth((_req) => {
  return undefined;
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)'],
};
