---
description: HITL 4대 원칙 + RBAC + 데이터 보호 (항상 적용, 위반 시 PR 거절)
globs: ["**/*"]
alwaysApply: true
---

# 004 — HITL, RBAC, Data Protection

> **원천**: [`docs/1_RPD_V_1.0.md`](../../docs/1_RPD_V_1.0.md) PRD v7.0 §3-C / [`docs/2_SRS_V_1.0.md`](../../docs/2_SRS_V_1.0.md) SRS v0.8 §5-3, CON-02, CON-03

이 룰은 **위반 시 PR 거절**됩니다. AI 출력의 안전성, ERP 데이터 보호, 사용자 권한 분리에 대한 절대 기준선입니다.

---

## 1. HITL (Human-in-the-Loop) 4대 원칙

### 원칙 ①: AI 단독 외부 발행·물리 행위 금지
AI 판단 결과는 **사람이 명시적으로 승인하기 전까지** 다음 행위를 수행할 수 없습니다:
- 외부 시스템에 데이터 발행 (ERP, 정부 포털, 이메일, 메신저, API 호출)
- 물리적 장비 제어 (액추에이터, 알람, 출력장치)
- 결제·계약·법적 효력이 있는 행위
- 실 사용자 데이터의 영구 변경 (DELETE, UPDATE on production)

**구현 패턴**: 모든 AI 결과는 **`status: 'PENDING_APPROVAL'`** 상태로 저장 → 사용자가 명시적 Approve 액션 → `status: 'APPROVED'` → 그제서야 외부 효과 발생.

### 원칙 ②: 수동 판단 모드 즉시 전환 (≤5분, 자동 복귀 30분)
AI 정확도가 임계치(예: STT 정확도 <70% 3회 연속) 이하로 떨어지면 **5분 이내**에 수동 입력 모드로 전환하고, 사용자에게 알림.
- 자동 복귀 조건: 30분 후 자가 진단 통과
- 위반 감지 메커니즘: `lib/ai/health.ts`에 monitor + Sentry 알림

### 원칙 ③: AI 판단 근거 한국어 시각화 (XAI)
모든 AI 이상 탐지·분류 결과는 **한국어로 판단 근거를 설명**해야 합니다.
- "왜 이 결과가 나왔는지" 핵심 feature 3개 이상 노출
- 신뢰도(confidence) 수치 함께 표시
- 사용자가 "동의 안 함" 클릭 시 학습 데이터로 피드백 저장

### 원칙 ④: 모든 AI 판단에 감사 로그 (audit_log)
AI가 판단한 모든 결정은 다음 필드와 함께 `audit_log` 테이블에 기록:
- `actor`: `ai-<model>-<version>` 또는 `user-<id>`
- `action`: `CREATE | UPDATE | APPROVE | REJECT | AUTO_FLAG`
- `target_type`, `target_id`
- `before` / `after` JSON
- `confidence` (AI인 경우)
- `ip_address`, `user_agent`
- `created_at`

**Retention**: 최소 1년. 보안 감사 시 export 가능 (CSV/JSON).

---

## 2. ERP Read-Only (CON-02) — 다층 방어

ERP 연동(Mock 포함)은 **Write 차단**이 필수입니다. 단일 가드만 두지 말고 **3중 방어**:

### Layer 1 — Prisma Schema
ERP 관련 모델은 **별도 schema 또는 별도 데이터베이스 연결**로 분리하고, 클라이언트가 Read-Only 권한만 가진 DB 사용자로 접속:

```prisma
// prisma/erp.prisma (별도 클라이언트)
datasource erpDb {
  provider = "postgresql"
  url      = env("ERP_READONLY_URL")  // 읽기 전용 권한의 DB user
}
```

### Layer 2 — Application Layer Middleware
모든 ERP 모델 접근 시 Prisma Middleware로 Write 작업 차단:

```typescript
// lib/erp/middleware.ts
erpPrisma.$use(async (params, next) => {
  if (['create', 'update', 'delete', 'upsert', 'updateMany', 'deleteMany'].includes(params.action)) {
    throw new Error('ERP_WRITE_FORBIDDEN: Read-only contract (CON-02)')
  }
  return next(params)
})
```

### Layer 3 — Database User Permissions
Supabase / PostgreSQL 사용자 자체가 ERP 스키마에 대해 `SELECT`만 부여. 애플리케이션 버그가 미들웨어를 우회해도 DB 레벨에서 차단.

### 위반 탐지
- CI 단계에서 `grep -r "erpPrisma.*\.(create|update|delete)" src/` 0건 강제
- 런타임에서 `ERP_WRITE_FORBIDDEN` 발생 시 Sentry 즉시 페이지

---

## 3. RBAC — 5개 역할

| Role | 권한 요약 |
|:---|:---|
| `ADMIN` | 전체 — 사용자 관리, 시스템 설정, 모든 데이터 |
| `OPERATOR` | 현장 운영 — 로그 입력·조회, 일일 리포트 생성, 자신의 데이터 |
| `QC` | 품질 관리 — XAI 결과 승인/거절, 이상 탐지 검토 |
| `CISO` | 보안 — 감사 로그 조회, RBAC 변경, 보안 정책 |
| `VIEWER` | 읽기 전용 — 대시보드 조회만 |

### 구현 가드
모든 보호 자원 접근은 `lib/rbac.ts`의 가드 함수 경유:

```typescript
// lib/rbac.ts
export async function requireRole(allowed: Role[]): Promise<Session> {
  const session = await getServerSession()
  if (!session || !allowed.includes(session.user.role)) {
    throw new ForbiddenError('RBAC_DENIED')
  }
  return session
}

// 사용
export async function deleteUser(id: string) {
  const session = await requireRole(['ADMIN'])
  // ...
}
```

### 위반 탐지
- 모든 Server Action / Route Handler 첫 줄에 `requireRole` 또는 `requireAuth` 호출 필수
- 누락 시 PR review에서 자동 reject (CI lint rule 예정)

---

## 4. Data Protection

### 4.1 입력 검증
- **모든 사용자 입력은 Zod 스키마 검증**. 미검증 데이터 DB 저장 금지.
- 파일 업로드: 크기 ≤10MB, MIME type whitelist, 바이러스 스캔 (Phase 2).
- SQL 인젝션: Prisma parameterized query 강제. `$queryRawUnsafe` 금지.
- XSS: React 기본 escape 신뢰. `dangerouslySetInnerHTML` 사용 시 PR 리뷰 필수.

### 4.2 비밀 관리
- `.env.local` 절대 커밋 금지 (`.gitignore` 확인).
- Vercel 환경변수 UI로 프로덕션 비밀 주입.
- Service Role Key (Supabase)는 서버에서만. `NEXT_PUBLIC_*` 접두사로 노출 금지.
- API 키 로테이션 주기: 3개월 (PoC 이후).

### 4.3 PII (개인정보)
- 작업자 이름·전화번호는 `PII` 태그 컬럼에 저장, RBAC `OPERATOR` 이상만 조회.
- 로그/Sentry에 PII 마스킹 (`mask("홍길동") → "홍**"`).
- GDPR/PIPA 삭제 요청 처리: `users.deleted_at` soft delete + 30일 후 hard delete.

### 4.4 전송/저장 암호화
- TLS 1.2+ (Vercel 자동 처리).
- 민감 컬럼(예: ERP 자격 증명)은 AES-256으로 저장 (`crypto.subtle` 또는 Supabase Vault).
- 감사 로그 백업은 암호화된 S3 (Phase 2).

---

## 5. 위반 시 대응

| 위반 종류 | 즉시 조치 |
|:---|:---|
| HITL 우회 코드 | PR 거절. 작성자에게 §1 원칙 링크 |
| ERP Write 시도 | 빌드 실패 (CI grep) + Sentry 알림 |
| RBAC 가드 누락 | PR 리뷰 reject |
| 비밀 노출 (커밋) | `git-secrets` rotate + force-push로 history 제거 |
| PII 평문 로그 | 로그 즉시 삭제 + 코드 수정 |

---

## See also

- [001-project-overview.md](001-project-overview.md)
- [002-tech-stack.md](002-tech-stack.md)
- [003-development-guidelines.md](003-development-guidelines.md)
- SRS §5-3 보안 요구사항
- SRS §3-C HITL 4대 원칙 (PRD §3-C 원본)
