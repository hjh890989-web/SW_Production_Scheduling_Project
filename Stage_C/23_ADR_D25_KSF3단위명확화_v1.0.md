# ADR D-25 — KSF-3 "변동 영향" 단위 이원화 (사용자 perceived 5분 / 서버측 ≤5초)

| 항목 | 내용 |
|---|---|
| 결정 ID | D-25 |
| 상태 | **확정 (Accepted)** |
| 결정일 | 2026-06-01 |
| 결정자 | PM (InterCooler_Ha) + AI 페어 (Claude) |
| 영향 범위 | VPS v1.2 KSF-3, PRD v1.4 AC PM-1-1, WBS Sprint 7 task DoD |
| 관련 결정 | D-10 (자동+수동 보정 철학), [정합성 검토 보고서 — 1-C](#) |

---

## 1. 배경 (Context)

VPS·PRD·WBS·Stage_D 이슈 전반에 걸쳐 KSF-3 "변동 영향 파악 시간" 목표 수치가 **사실상 다른 두 의미로 사용**되고 있음:

| 문서 | 표기 | 의미 추정 |
|---|---|---|
| [VPS v1.2](../Stage_B/13_VPS_v1.2.md) KSF-3 | "4시간 → **5분**" | 사용자가 변동을 인지하고 의사결정까지의 wall-clock 시간 |
| [PRD v1.4](19_PRD_v1.4.md) AC PM-1-1 | "변동 시뮬 ≤**5초**" | 시스템이 변동 입력 후 영향 시뮬 결과를 화면에 렌더하기까지의 응답시간 |
| [WBS v1.1](20_WBS_v1.1.md) T7.x | "변동 → **5분**" (페이지 §1.5), "5초 내 시각화" (T7.5) | 혼재 |
| Stage_D AC | "5000ms" (PM-1-1), "p95 5초" | 서버측 응답 |

두 수치는 **60배 차이**가 나며, 외부 검증자(예: 박철수 반장 사용성 테스트 시) 어느 수치를 기준으로 평가할지 혼란을 야기할 수 있다.

본 정합성 검토(2026-06-01) 결과 식별된 치명적 이슈 1-C에 대한 조치.

## 2. 결정 (Decision)

**KSF-3를 다음과 같이 이원 정의한다:**

### KSF-3a (사용자 perceived target)
- **목표**: 변동 발생 → 사용자가 영향 범위를 **인지하고 의사결정까지** 4시간 → **≤5분**
- **측정 위치**: VPS·임원 보고·ROI 계산
- **포함 활동**: 변동 입력 + 시뮬 결과 확인 + 진행중 건 식별 + 액션 결정
- **검증 방법**: T11.1 E2E 시나리오(페르소나 김민수)에서 wall-clock 측정

### KSF-3b (서버측 응답 target — NFR)
- **목표**: 변동 입력 Submit 후 영향 시뮬 결과 첫 페인트까지 **≤5초** (p95)
- **측정 위치**: PRD AC PM-1-1, NFR §5.1, T11.2 k6 부하 시험
- **포함 활동**: API 라운드트립 + 영향 시뮬 알고리즘 + 화면 렌더
- **검증 방법**: Playwright 측정 + Prometheus `http_request_duration_seconds` 메트릭

### 두 수치의 관계
KSF-3a(5분) 안에 KSF-3b(5초) 응답이 ≥10회 반복 가능 → 사용자가 여러 시나리오를 빠르게 비교 가능. KSF-3a는 **목표 outcome**, KSF-3b는 **이를 가능하게 하는 기술적 enabler**.

## 3. 결과 (Consequences)

### 긍정
- ✅ VPS 임원 보고와 PRD AC가 모두 정합 가능 (두 수치가 다른 차원을 측정함을 명시)
- ✅ T5.12 사용성 테스트 시 박철수 반장에게 어느 수치를 안내할지 명확 (KSF-3a 5분)
- ✅ T11.2 k6 부하 시험 임계치 명확화 (p95 5초)

### 부정
- ⚠️ KSF-3 단일 수치였던 기존 표기들이 모두 "a/b"로 분기되어 문서 가독성 일시 저하
- ⚠️ 사용성 테스트에서 KSF-3a 측정 시 "사용자가 의사결정까지" 정의의 모호성 존재 (어디까지가 "의사결정"인가)

### 완화책
1. **KSF-3a 정의 명확화**: VPS v1.3 또는 PRD v1.5에서 "변동 입력 + 시뮬 확인 + 1차 액션(드래그 또는 확정) 완료"까지로 명시
2. **자동 측정 도구**: AuditLog의 timestamp 기반으로 KSF-3a 자동 측정(`OrderChange.createdAt` → `ManualSchedule.confirmedAt` delta)
3. **5초 임계치 strict 유지**: KSF-3b는 NFR이므로 절대 완화 금지. 미달 시 알고리즘 최적화 또는 Sprint 12.2 OR-Tools 도입

## 4. 시행 사항 (Implementation)

### 이번 turn 즉시 처리
- [x] 본 ADR D-25 발행
- [ ] 정합성 검토 보고서 1-C 이슈 종결 표시

### PRD v1.5 개정 시 (별도 turn)
- [ ] [PRD v1.4 §3 AC PM-1-1](19_PRD_v1.4.md) 본문에 "KSF-3b NFR" 명시
- [ ] [PRD v1.4 §1.5 KSF 표](19_PRD_v1.4.md) 에 KSF-3a / KSF-3b 행 분리
- [ ] [VPS v1.3 KSF-3](../Stage_B/) 동일 분기 반영

### Stage_D 이슈 갱신 (별도 turn)
- [ ] [T7.1 영향 시뮬 알고리즘](../Stage_D/issues/) — DoD에 "KSF-3b p95 ≤5초" 명시
- [ ] [T11.2 k6 부하 시험](../Stage_D/issues/) — 임계치 "p95 5초" 명시
- [ ] [T5.12 사용성 테스트](../Stage_D/issues/T5.12_beta-usability-test.md) — 시나리오 안내문에 KSF-3a 5분 명시

## 5. 참조

- [Stage_B/13_VPS_v1.2.md](../Stage_B/13_VPS_v1.2.md) — KSF-3 원 정의
- [Stage_C/19_PRD_v1.4.md](19_PRD_v1.4.md) — AC PM-1-1 ≤5초
- [Stage_C/20_WBS_v1.1.md](20_WBS_v1.1.md) — T7.x 시뮬 task
- [Stage_C/22_ADR_D22_TBD5종결_v1.0.md](22_ADR_D22_TBD5종결_v1.0.md) — 선행 ADR 패턴
