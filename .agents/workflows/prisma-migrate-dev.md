---
name: prisma-migrate-dev
description: Prisma 스키마 변경 → 마이그레이션 생성 → 타입 재생성 → 시드 갱신 → 검증 절차
---

# Prisma Migration Workflow

> **트리거**: 사용자가 "스키마 바꿔" / "테이블 추가" / "migration" 요청 시.

## 1. 스키마 편집
- `prisma/schema.prisma` 수정
- 네이밍 규칙 준수 (`.cursor/rules/200-prisma.mdc`):
  - Model: PascalCase 단수
  - 테이블: `@@map("snake_case_plural")`
  - ERP 모델은 `Erp` prefix + 별도 클라이언트 적용

## 2. Migration 생성 (dev)
```bash
# 변경 내용을 마이그레이션으로 캡처
npx prisma migrate dev --name <descriptive-snake-case>

# 예
npx prisma migrate dev --name add_ai_suggestion_table
npx prisma migrate dev --name add_erp_inventory_safety_stock
```

이 명령은:
1. shadow database로 변경 검증
2. SQL migration 파일 생성 (`prisma/migrations/<timestamp>_<name>/migration.sql`)
3. dev DB에 적용
4. `npx prisma generate` 자동 실행

## 3. 타입 재생성 확인
```bash
npx prisma generate
```
- `node_modules/.prisma/client/index.d.ts` 갱신 확인
- IDE/TS 서버 재시작 (필요 시)

## 4. Seed 갱신
새 모델/필드가 추가됐다면 `prisma/seed.ts`에 시드 데이터 추가:
```bash
npx prisma db seed
```

ERP 모델 추가 시 `.agents/skills/304-mock-erp-pattern` 참조해 더존 iCUBE 스키마 모방 데이터.

## 5. 영향받는 코드 갱신
- Server Action / Route Handler의 Prisma 쿼리 (타입 자동 추적되므로 IDE가 알려줌)
- Zod schema (입력 검증)
- 컴포넌트 props (TypeScript가 잡아줌)
- 테스트 fixture

## 6. 검증
```bash
npm run typecheck  # 새 타입 정합성
npm run build      # 전체 빌드
npm run lint       # 스타일
```

## 7. 커밋 단위
- 마이그레이션 + 시드 갱신 + 영향받은 코드 → **한 커밋**
- 메시지: `feat(prisma): add ai_suggestion table for HITL pattern`
- Footer: `Refs REQ-FUNC-NNN`, `Closes #NN`

## 8. MVP/PROD 적용
main 머지 후 Vercel auto-deploy가 자동으로:
```bash
npx prisma migrate deploy  # CI 단계에서 실행 (Vercel build script)
```

수동 실행이 필요한 경우 (긴급 hotfix):
```bash
# 로컬에서 MVP DB로 적용
DATABASE_URL=$MVP_DATABASE_URL DIRECT_URL=$MVP_DIRECT_URL npx prisma migrate deploy
```

## 주의 사항

### Migration 충돌
- 여러 PR이 동시 schema 수정 시 충돌 → 후순위 PR이 `migrate dev` 다시 실행 + 머지
- 절대 미들웨어로 migration 파일 직접 편집 금지 (해시 깨짐)

### Breaking change
- 컬럼 삭제 / 타입 변경 → 데이터 손실 가능
- Multi-step migration 권장:
  1. 새 컬럼 추가 (nullable)
  2. 데이터 백필
  3. 코드를 새 컬럼 사용으로 전환
  4. 옛 컬럼 삭제 (별도 PR)

### ERP 스키마
- `Erp*` 모델 변경 시 `.agents/skills/301-erp-readonly-guard` 패턴 위반 가능성 검토
- 시드는 일반 prisma로 (미들웨어 우회 OK), 런타임은 erpPrisma로

### Rollback
```bash
# 마이그레이션 되돌리기 — 정식 명령 없음. 새 migration으로 reverse:
npx prisma migrate dev --name revert_ai_suggestion
```
