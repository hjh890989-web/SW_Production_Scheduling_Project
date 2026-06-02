# Sprint 9 (MES 연동·F-7) 의사결정 로그

T9.1~T9.6 자동화 루프(`/goal`)의 명세 미확정 결정 기록. CORE=아키텍처·보안·외부의존, MINOR=네이밍·UI·로그 포맷.

---

## CORE

### CORE-1 (T9.1) 실 MES는 Mock fallback (TBD-3 미해소)
- 실 MES 사양(TBD-3)이 확정되지 않아 `MesClientLive` 실 구현 불가.
- `env MES_CLIENT=live`도 현재는 `MesClientMock`으로 fallback + 경고(AC T9.1-F1). 외부 호출 코드 미작성(사내망·외부 호출 금지 준수).
- 인터페이스(`IMesClient`)·타입(`types.ts`)·Mock만 확정해 후속 task(T9.2~9.5)가 추상화에 의존하도록 한다.

### CORE-2 (T9.2) 실적 수신 인증: API key 헤더(`x-mes-api-key`) + audit
- IP 화이트리스트 대신 env `MES_API_KEY`와 헤더 비교(사내망 + AuditLog 기록으로 충분). 빈 env면 항상 401.
- 멱등성은 `ProductionResult.externalId @unique` + 수신 시 존재검사로 중복 INSERT 방지.

---

## MINOR

### MINOR-1 (T9.1) MES 도메인 타입 — externalId 멱등 키 + process MOLDING/EXTRUSION
- 실적 레코드에 `externalId`(MES 고유 ID)를 멱등성 키로 둔다(T9.2 @unique 연계).
- 공정 구분은 String union `'MOLDING' | 'EXTRUSION'`(CORE-1 패턴).

### MINOR-2 (T9.2) 스키마 반영은 `prisma db push`
- 본 프로젝트는 `prisma/migrations/`가 없고 db push 기반 → 신규 모델도 동일 방식. 마이그레이션 파일 생성/수정 없음(제약 준수).

### MINOR-3 (T9.3) 재고 1행/품번(Inventory.itemId @id) + 납품 모델 동시 정의
- `Inventory`는 품번당 단일 행(itemId PK), upsert로 갱신. 음수 가드는 트랜잭션 내 throw→롤백.
- `DeliveryResult`도 동일 패턴으로 모델 선반영(납품 수신 엔드포인트는 Sprint 9 범위 밖 — MES 납품 피드 TBD). 재고 차감(−) 경로는 순수 함수로 테스트.

---

CORE: 2
MINOR: 3
