# 보안·품질 하드닝 리뷰 (2026-06-04)

출시 직전 고위험 표면(인증/RBAC · MES/ERP API · audit/재고 트랜잭션 · 파일 업로드 · 웹 보안)을 정밀 리뷰하고
**안전·테스트 가능한 항목은 즉시 수정**, **런타임 검증/제품 결정이 필요한 구조적 항목은 정확한 수정안과 함께 이연**했다.
리뷰 방식: 5개 병렬 리뷰 에이전트 → 각 발견을 실제 코드로 직접 검증 → 수정/이연 분류.

---

## ✅ 수정 완료 (이 PR)

| # | 심각도 | 위치 | 문제 | 수정 |
|---|---|---|---|---|
| 1 | **CRITICAL** | `public/sw.js` | SW가 인증·사용자별 HTML/응답을 URL 키로 공유 캐시 → 공유/키오스크 기기에서 **타 세션에 노출** | 정적 자산만 캐시(`lib/pwa/cacheable.ts` 순수규칙+테스트), 내비게이션 network-first, 인증셸(`/`) 대신 세션無 `/offline` 폴백, basic·비리다이렉트 200만 저장 |
| 2 | **HIGH** | `lib/notification-actions.ts` | `getNotifications(userId)`/`getUnreadCount(userId)`가 임의 userId를 받는 `'use server'` → **IDOR** | 세션에서 userId 파생, 파라미터 제거 |
| 3 | **HIGH** | `lib/notification-actions.ts` | `notify()`가 무인증 `'use server'` 익스포트 → 임의 알림 주입 | 내부 모듈 `lib/notify.ts(createNotification)`로 이전(액션 노출 제거), 3개 서비스 repoint |
| 4 | **HIGH** | `app/api/mes/result/route.ts`, `lib/mes/retry-policy.ts` | 배치/lines 배열 크기 무제한 → DoS | `.max(1000)` 추가 |
| 5 | **HIGH** | ETL 파서 3종 | 소수·`Infinity` 수량이 Int 컬럼에 도달해 **배치 전체 롤백** | `toQuantity`(양의 정수·≤Int4) 공용 가드 + 테스트 |
| 6 | **HIGH** | `lib/inventory/inventory-service.ts` | 재고 read-modify-write 경합(Postgres lost update) | 생산경로(delta≥0) DB **원자 increment**로 교체 |
| 7 | **MED** | `app/api/mes/result/route.ts` | externalId TOCTOU → 동시 중복 수신 시 unique 위반 500 | `P2002` catch → 멱등 skip |
| 8 | **MED** | `lib/mes/result-mapping.ts`, `lib/erp/sync-mapping.ts` | API key 비상수시간 비교(타이밍 사이드채널) | `crypto.timingSafeEqual`(sha256 다이제스트) |
| 9 | **MED** | `lib/extrusion/move-actions.ts` | 확정에 `extrusion:write` 사용 → EXTRUSION_LEADER가 확정 가능 | `extrusion:confirm`으로 교정(RBAC 매트릭스 일치) |
| 10 | **MED** | `lib/mes/retry-policy.ts`, `monthly-forecast-parser.ts` | `weekStart`/예측 헤더가 달력상 무효 일자(2026-13-40, 2/30) 허용 | 실제 달력 일자 검증(round-trip) |
| 11 | **MED** | MES `result`/`instruction` route | 검증 실패 응답에 zod `issues` 노출(정보 누출) | 내부 로그만, 응답은 일반 메시지 |
| 12 | **MED** | `lib/security/headers.js` | HSTS `includeSubDomains`가 사내 HTTP 서브도메인 하드 차단 위험 | `includeSubDomains` 제외, max-age 1년 |
| 13 | **MED** | `package.json` | `xlsx`가 prod에서 쓰이나 `devDependencies` → prod 설치 누락 위험 | `dependencies`로 이동 |
| 14 | **LOW** | `lib/orders/mapping-actions.ts` | `getMappingRules()` 무가드 `'use server'` | `master:read` 가드 추가 |
| 15 | LOW(보강) | 수량 스키마 | Int4 overflow | `.max(2_147_483_647)` 추가 |

검증: 5종 게이트(test 356 / lint 0 / typecheck 0 / prisma valid / build 0) 통과. 신규 npm 의존성 0.

---

## ⏸️ 이연 (런타임 검증·제품 결정 필요 — 별도 PR 권장)

| 심각도 | 위치 | 문제 | 권장 수정 | 이연 사유 |
|---|---|---|---|---|
| **HIGH** | `auth.config.ts` / `lib/actions/password.ts` | `User.sessionVersion` 정의되나 **미집행** — 비밀번호 변경 후에도 기존 JWT 유효(세션 무효화 규칙 위배) | 비번 변경 시 `sessionVersion` 증가 + jwt/session 콜백에서 DB 값과 비교(Edge/Node 분리 주의) | 콜백이 Edge(미들웨어) 공유 — 매 요청 DB조회 추가가 인증 흐름에 영향, 앱 구동 검증 필요 |
| **HIGH** | `lib/scheduler/move-rules.ts` + 6 call sites | 낙관적 락이 JS TOCTOU 비교 → lost update 가능(⭐T5.6 J-MR-2 포함) | `update({where:{id, updatedAt: expected}})`로 DB CAS, P2025를 충돌로 처리 | 6개 액션 일괄 변경 + 충돌 UX 회귀 검증 필요(앱 구동) |
| **HIGH** | `app/api/mes/result/route.ts:60-62`, `sync-service.ts:47-48` | ProductionResult create + 재고 갱신 비원자 → 부분 실패 시 재고 누락(멱등 skip이 영구화). #6/#7로 경합·롤백은 완화했으나 **두 쓰기의 원자성**은 미해결 | 두 쓰기를 단일 `$transaction`(tx 공유)로 묶기 | 트랜잭션 중첩·`headers()`/audit 상호작용 런타임 검증 필요 |
| **HIGH** | `lib/security/headers.js` | `script-src 'unsafe-inline'`이 CSP의 XSS 방어를 무력화 | 미들웨어 per-request nonce + `'strict-dynamic'`, `'unsafe-inline'` 제거 | Next App Router nonce 적용은 앱 구동 회귀 검증 필수(렌더 깨짐 위험) |
| **MED** | `lib/orders/upload.ts` | 동일 파일 재업로드 시 ACTIVE 주문 **중복 적재**(supersede/dedup 없음) | 자연키 `@@unique` 또는 업로드 트랜잭션 내 기존 ACTIVE supersede | supersede 범위(품번/소스/전체)는 **제품 결정** 필요 |
| **MED** | `lib/orders/upload.ts`, `mapping-actions.ts` | 업로드 MIME/매직바이트·행수 상한 없음(zip-bomb/DoS), `simulateUpload`는 size 제한도 없음 | 매직바이트 검사 + `sheetRows` 상한 + 공용 read 헬퍼 | 파서 동작 회귀 검증 권장 |
| **MED** | `xlsx@0.18.5` | CVE-2023-30533(proto pollution)·ReDoS — npm에 패치 버전 없음 | SheetJS 공식 CDN 패치본 핀 또는 `exceljs` 이관 | 의존성 교체/마이그레이션은 별도 작업 |
| **MED** | `app/api/erp/sync/route.ts` | 레코드별 쓰기 무가드 → 단일 실패 시 unhandled 500 + 부분 상태 | 루프/라우트 try-catch + 실패 audit + 일반 500 | runErpSync 흐름 검증 권장 |
| **MED** | `lib/audit.ts` | DB 실패 시 stdout fallback만 → DB 장애와 동시에 로그 파이프 다운 시 **5년 보존 레코드 유실 가능** | append-only 파일(fsync) 폴백 또는 고가치 경로 in-transaction audit | 배포 로그 파이프라인 전제 확인 필요 |
| LOW | `app/api/metrics/route.ts` | 무인증 비즈니스 카운트 노출(사내망 전제 OK) | nginx bearer/IP allowlist 또는 카운트 제거 | nginx 적용 단계 |
| LOW | `lib/route-permissions.ts` | `/orders/audit`가 `order:read`로 매칭(페이지 레벨에서 audit:read 재검증해 노출은 차단됨) | longest-prefix 매칭 또는 명시 엔트리 | 방어심층 보강 |
| LOW | `lib/export/excel-exporter.ts` | 재export 시 수식 인젝션 비중화(업로드 경로에서는 현재 도달 불가) | `= + - @ TAB CR` 시작 셀 prefix | 방어심층 |
| LOW | `lib/orders/mapping-defaults.ts` | `columnMapping` 키에 `__proto__` 허용·인덱스 무상한 | 키 enum·`.max(255)` | 현재 파서가 매핑 미사용이라 영향 제한 |
| LOW | 파서 vs `mapping-actions` | 저장된 `ExcelMappingRule`을 파서가 무시(설정 무효) | 룰을 파서에 주입 또는 에디터 비활성 | 기능 기대 불일치(보안 아님) |

---

## 메모
- 이연 항목 중 **sessionVersion 집행 · 낙관적 락 DB CAS · CSP nonce**가 우선순위 높음 — 사내 서버에서 앱 구동 가능해지면 별도 PR로 검증하며 적용 권장.
- 본 라운드는 "외부 입력 표면 + 교차 사용자 노출 + 데이터 무결성"의 즉시 수정 가능분에 집중했다.
