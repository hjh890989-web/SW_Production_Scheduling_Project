import { validatePasswordPolicy } from '../lib/auth/password-policy';

/** 시드 사용자 정의 (T1.7 — Admin + 5 페르소나 Role). 부수효과 없는 순수 모듈. */
export interface SeedUser {
  username: string;
  password: string;
  name: string;
  role: string;
  email: string;
}

// 합성 사번(9000000X)·admin — E2E/데모용 고정 계정(실사원과 충돌 없는 9번대).
// 실제 사원은 엑셀(결재선 정보.xlsx) → seed-employees로 별도 적재(실데이터, git 제외).
export const SEED_USERS: SeedUser[] = [
  { username: 'admin', password: '1234', name: '시스템관리자', role: 'ADMIN', email: 'admin@evs.local' },
  { username: '90000001', password: '0000', name: '생산관리', role: 'PRODUCTION_MANAGER', email: 'pm@evs.local' },
  { username: '90000002', password: '0000', name: '성형반장', role: 'MOLDING_LEADER', email: 'molding@evs.local' },
  { username: '90000003', password: '0000', name: '압출반장', role: 'EXTRUSION_LEADER', email: 'extrusion@evs.local' },
  { username: '90000004', password: '0000', name: '자재구매', role: 'SALES_PURCHASE', email: 'material@evs.local' },
  { username: '90000005', password: '0000', name: '경영진', role: 'EXECUTIVE', email: 'exec@evs.local' },
];

/** 모든 시드 비밀번호가 정책을 만족하는지 검증 (AC T1.7-F1). 위반 시 명확한 에러 throw. */
export function assertSeedPolicy(users: SeedUser[] = SEED_USERS): void {
  for (const u of users) {
    const r = validatePasswordPolicy(u.password);
    if (!r.valid) {
      throw new Error(
        `시드 비밀번호 정책 위반 (${u.username}): ${r.errors.join(' ')} — 4자리 숫자 PIN이 필요합니다.`,
      );
    }
  }
}
