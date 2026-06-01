import { handlers } from '@/auth';

// Auth.js v5 Route Handlers (로그인/로그아웃/세션). middleware matcher에서 api/auth 제외됨.
export const { GET, POST } = handlers;
