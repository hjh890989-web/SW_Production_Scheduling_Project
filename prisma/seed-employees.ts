import type { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { hashPassword } from '../lib/auth/password';

/**
 * 실사원 임포트 (결재선 정보.xlsx → User). 실데이터이므로 엑셀은 git 제외(.gitignore).
 * evs 실사용 대상만 선별 + 부서·직위 기반 6 Role 매핑:
 *   - 직위 이사/이사대우            → EXECUTIVE
 *   - 반장 & 부서 '성형'            → MOLDING_LEADER
 *   - 반장 & 부서 '준비/마무리/가공' → EXTRUSION_LEADER (압출 공정)
 *   - 물류자재팀                    → SALES_PURCHASE
 *   - 경영기획팀                    → PRODUCTION_MANAGER
 *   - 그 외(개발·재무·일반 사원 등)  → 제외
 * 초기 PIN은 0000(전원 강제 변경 권장). 엑셀이 없으면(다른 환경·CI) 생략한다.
 */
const XLSX_PATH = path.resolve(process.cwd(), '_local', '결재선 정보.xlsx');
const INITIAL_PIN = '0000';

export function mapEmployeeRole(dept: string, position: string): string | null {
  if (/이사/.test(position)) return 'EXECUTIVE';
  if (position === '반장' && /성형/.test(dept)) return 'MOLDING_LEADER';
  if (position === '반장' && /(준비|마무리|가공)/.test(dept)) return 'EXTRUSION_LEADER';
  if (dept === '물류자재팀') return 'SALES_PURCHASE';
  if (dept === '경영기획팀') return 'PRODUCTION_MANAGER';
  return null;
}

export async function seedEmployees(prisma: PrismaClient): Promise<number> {
  if (!existsSync(XLSX_PATH)) {
    console.log('  (결재선 정보.xlsx 없음 — 실사원 임포트 생략, 합성 계정만)');
    return 0;
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);
  const pinHash = await hashPassword(INITIAL_PIN);
  let count = 0;

  for (const ws of wb.worksheets) {
    const header = (ws.getRow(1).values as unknown[]).map((x) => String(x ?? '').trim());
    const di = header.indexOf('근무부서');
    const pi = header.indexOf('직위');
    const si = header.indexOf('사번');
    const ni = header.indexOf('사원');
    if (si < 0 || di < 0 || pi < 0) continue;

    for (let r = 2; r <= ws.rowCount; r += 1) {
      const v = ws.getRow(r).values as unknown[];
      const sabun = String(v[si] ?? '').trim();
      if (!/^\d{8}$/.test(sabun)) continue; // 사번은 8자리 숫자만
      const role = mapEmployeeRole(String(v[di] ?? '').trim(), String(v[pi] ?? '').trim());
      if (!role) continue; // evs 무관 부서·직위는 제외
      const name = String(v[ni] ?? '').trim() || sabun;

      await prisma.user.upsert({
        where: { username: sabun },
        update: { name, role },
        create: {
          username: sabun,
          email: `${sabun}@evs.local`,
          name,
          role,
          passwordHash: pinHash,
          passwordChangedAt: new Date(),
          mustChangePassword: true, // 실사원은 초기 PIN(0000) 첫 로그인 시 변경 강제
        },
      });
      count += 1;
    }
  }

  console.log(`  ✓ 실사원 ${count}명 적재 (초기 PIN ${INITIAL_PIN}, 부서·직위 자동 매핑)`);
  return count;
}
