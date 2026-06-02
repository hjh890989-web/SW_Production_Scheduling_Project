# Sprint 9 (MES 연동·F-7) 의사결정 로그

T9.1~T9.6 자동화 루프(`/goal`)의 명세 미확정 결정 기록. CORE=아키텍처·보안·외부의존, MINOR=네이밍·UI·로그 포맷.

---

## CORE

### CORE-1 (T9.1) 실 MES는 Mock fallback (TBD-3 미해소)
- 실 MES 사양(TBD-3)이 확정되지 않아 `MesClientLive` 실 구현 불가.
- `env MES_CLIENT=live`도 현재는 `MesClientMock`으로 fallback + 경고(AC T9.1-F1). 외부 호출 코드 미작성(사내망·외부 호출 금지 준수).
- 인터페이스(`IMesClient`)·타입(`types.ts`)·Mock만 확정해 후속 task(T9.2~9.5)가 추상화에 의존하도록 한다.

---

## MINOR

### MINOR-1 (T9.1) MES 도메인 타입 — externalId 멱등 키 + process MOLDING/EXTRUSION
- 실적 레코드에 `externalId`(MES 고유 ID)를 멱등성 키로 둔다(T9.2 @unique 연계).
- 공정 구분은 String union `'MOLDING' | 'EXTRUSION'`(CORE-1 패턴).

---

CORE: 1
MINOR: 1
