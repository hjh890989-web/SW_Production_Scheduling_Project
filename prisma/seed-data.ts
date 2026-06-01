import { validatePasswordPolicy } from '../lib/auth/password-policy';

/** 시드 사용자 정의 (T1.7 — Admin + 5 페르소나 Role). 부수효과 없는 순수 모듈. */
export interface SeedUser {
  username: string;
  password: string;
  name: string;
  role: string;
  email: string;
}

export const SEED_USERS: SeedUser[] = [
  { username: 'admin', password: 'admin1234!', name: '시스템관리자', role: 'ADMIN', email: 'admin@evs.local' },
  { username: 'kimms', password: 'Test1234!', name: '김민수', role: 'PRODUCTION_MANAGER', email: 'kimms@evs.local' },
  { username: 'parkcs', password: 'Test1234!', name: '박철수', role: 'MOLDING_LEADER', email: 'parkcs@evs.local' },
  { username: 'leeyh', password: 'Test1234!', name: '이영호', role: 'EXTRUSION_LEADER', email: 'leeyh@evs.local' },
  { username: 'jungsj', password: 'Test1234!', name: '정수진', role: 'SALES_PURCHASE', email: 'jungsj@evs.local' },
  { username: 'exec', password: 'Test1234!', name: '경영진', role: 'EXECUTIVE', email: 'exec@evs.local' },
];

/** 모든 시드 비밀번호가 정책을 만족하는지 검증 (AC T1.7-F1). 위반 시 명확한 에러 throw. */
export function assertSeedPolicy(users: SeedUser[] = SEED_USERS): void {
  for (const u of users) {
    const r = validatePasswordPolicy(u.password);
    if (!r.valid) {
      throw new Error(
        `시드 비밀번호 정책 위반 (${u.username}): ${r.errors.join(' ')} — 8자 이상, 영문+숫자+특수문자가 필요합니다.`,
      );
    }
  }
}
