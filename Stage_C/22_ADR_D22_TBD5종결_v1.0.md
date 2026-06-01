# ADR D-22 — TBD-5(B-3 현장 인터뷰) 시뮬레이션 인터뷰로 1차 종결, 실증은 T5.12 사용성 테스트로 이연

| 항목 | 내용 |
|---|---|
| 결정 ID | D-22 |
| 상태 | **확정 (Accepted)** |
| 결정일 | 2026-06-01 |
| 결정자 | PM (InterCooler_Ha) + AI 페어 (Claude) |
| 영향 범위 | Stage_B JTBD/VPS, Stage_C PRD, Stage_D WBS, Sprint 0~5 진입 가능성 |
| 관련 결정 | D-10 (자동+수동 보정 철학), R2 (현장 반장 거부 리스크) |

---

## 1. 배경 (Context)

PRD v1.4 §17 TBD 목록에 명시된 **TBD-5: 박철수·이영호 반장 B-3 현장 인터뷰**는 Sprint 5 진입 전 필수 사전 조건으로 명시되어 있었다. 그러나 다음 이유로 실제 인터뷰가 지연되고 있었다:

- 현장 반장 일정 조율 어려움 (월요일 취합 + 수요일 회의 + 야간 교대 등 변수)
- 시뮬레이션 인터뷰 입력 자료(Stage_B/14 현장인터뷰질문지 25문)는 이미 준비됨
- Sprint 0 진입 시점이 임박 (2026-06-01 기준 +0일)

이 상태가 지속되면 Sprint 0~4 진입까지 모두 차단되어 8주 MVP 일정 전체가 미끄러진다.

## 2. 결정 (Decision)

**TBD-5를 다음과 같이 분할 처리한다:**

### TBD-5a (지금 종결)
- [Stage_B/15_JTBD인터뷰결과_v1.0.md](../Stage_B/15_JTBD인터뷰결과_v1.0.md) — 시뮬레이션 인터뷰 8명 결과(시나리오 기반)를 디자인 의사결정 입력으로 채택
- 이로써 Sprint 0~4 진입 차단 해제
- JTBD 가설 14건 중 P0 11건의 디자인 방향은 이 문서로 unblock

### TBD-5b (Sprint 5로 이연)
- [Stage_D/issues/T5.12_beta-usability-test.md](../Stage_D/issues/T5.12_beta-usability-test.md) — 박철수·이영호 반장 hands-on 프로토타입 사용성 테스트(1일, 8h)로 변환
- 인터뷰가 아닌 **실제 드래그 조작 체험** 형태로 가설 검증 강도를 더 높임
- Sprint 5 T5.6(W-4 드래그·재배분) DoD에 "T5.12 결과 반영"을 추가하여 Sprint 5 종료 전 반드시 실증 통과

## 3. 결과 (Consequences)

### 긍정 (Pros)
- ✅ Sprint 0 즉시 착수 가능 — 인프라(CLAUDE.md, .claude/, .gitignore)는 이미 정비 완료
- ✅ J-MR-2 채택률 ≥90% (KSF-6) 가설 검증이 **인터뷰(말로 확인)에서 hands-on(실제 조작)으로 강화**됨 — 검증 강도 ↑
- ✅ 시뮬레이션 단계에서 발견된 **숨겨진 Job 3건**(엑셀 Export 필수, 책임 소재 분리, 과거 실패 트라우마)이 사전 반영되어 디자인 초안의 적합도 향상

### 부정 (Cons / Risks)
- ⚠️ 시뮬레이션 인터뷰는 실제 발화의 미묘함(머뭇거림, 자기검열, 비언어적 단서)을 포착하지 못함 — 콘텐츠 신뢰도는 80%~90% 추정
- ⚠️ Sprint 5 T5.12에서 박철수 반장이 "이건 못 쓰겠다"고 판단할 경우 **이미 만든 Sprint 5 산출물(약 78h 분량) 재설계 위험** — J-MR-2 UX를 핵심 가설로 두는 한 이 리스크는 분리 불가능
- ⚠️ 정 시뮬레이션이 잘못된 가설을 강화한 경우, Sprint 5에서 발견될 때까지 5~6주간 잘못된 방향으로 진행될 수 있음

### 완화책 (Mitigations)
1. **Sprint 5 진입 전 박철수 반장에게 30분 화상 인터뷰** — Stage_B/14 질문지 중 J-MR-2 관련 5문만 발췌(요청 부담 최소화). 본 문서 D-22 결정과 별개로 권장.
2. **Sprint 5 T5.6 구현 시 프로토타입을 일찍 박철수에게 보여줌** — T5.6 완료 시점이 아니라 T5.4(W-4 Grid) 완료 직후 1차 데모.
3. **시뮬레이션 인터뷰 결과의 검증 가능한 가정만 신뢰** — DOS 점수, 4 Forces 패턴 등은 채택. 구체적 발화 인용은 디자인 카피라이팅에 직접 사용 금지.

## 4. 대안 (Alternatives Considered)

| 대안 | 검토 결과 |
|---|---|
| **A. 실제 인터뷰가 완료될 때까지 Sprint 0 진입 무기한 보류** | 일정 리스크가 너무 큼. 사내 반장 일정 조율은 외부 요인이라 PM 통제 불가. **거부** |
| **B. 시뮬레이션 인터뷰만으로 종결, T5.12 추가 task 없음** | J-MR-2 ⭐⭐ 채택률 가설 검증이 누락됨 — Sprint 5에서 도입 실패 시 회복 불가. **거부** |
| **C. 시뮬레이션 + 사용성 테스트 (본 결정)** | Sprint 0 진입 가능 + 검증 강도 유지. **채택** |
| D. PRD/WBS에서 J-MR-2 ⭐⭐ 표시를 ⭐로 격하 | D-10 자동+수동 철학의 본체를 약화시키는 결정. 본 결정의 범위를 벗어남. **거부** |

## 5. 시행 사항 (Implementation)

- [x] [Stage_B/15_JTBD인터뷰결과_v1.0.md](../Stage_B/15_JTBD인터뷰결과_v1.0.md) 작성·커밋
- [x] [Stage_D/issues/T5.12_beta-usability-test.md](../Stage_D/issues/T5.12_beta-usability-test.md) 신규 생성·커밋
- [ ] WBS v1.1 개정 시 T5.12를 Sprint 5에 추가 (현재 v1.0은 in-place edit 금지로 보류)
- [ ] PRD v1.5 개정 시 §17 TBD 목록에서 TBD-5 처리 결과 반영 (현재 v1.4는 보류)
- [ ] T5.6 issue 파일의 DoD 항목 "박철수 페르소나 인터뷰 결과 반영 (TBD-5 후)" → "T5.12 사용성 테스트 결과 반영"으로 갱신 (다음 Stage_D 정비 turn에 일괄 처리)

## 6. 참조

- [Stage_B/10_JTBD리스트_v1.0.md](../Stage_B/10_JTBD리스트_v1.0.md) — JTBD 14건 P0/P1/P2 분류
- [Stage_B/13_VPS_v1.2.md](../Stage_B/13_VPS_v1.2.md) — KSF-6 채택률 ≥90% 목표
- [Stage_B/14_현장인터뷰질문지_v1.0.md](../Stage_B/14_현장인터뷰질문지_v1.0.md) — 25문 인터뷰 가이드
- [Stage_B/15_JTBD인터뷰결과_v1.0.md](../Stage_B/15_JTBD인터뷰결과_v1.0.md) — 본 결정의 입력 자료
- [Stage_C/19_PRD_v1.4.md](19_PRD_v1.4.md) — TBD-5 원 정의
- [Stage_C/20_WBS_v1.0.md](20_WBS_v1.0.md) — Sprint 5 task 구성
- [Stage_D/issues/T5.6_w4-drag-redistribute-jmr2.md](../Stage_D/issues/T5.6_w4-drag-redistribute-jmr2.md) — J-MR-2 ⭐⭐ 핵심 task
- [Stage_D/issues/T5.12_beta-usability-test.md](../Stage_D/issues/T5.12_beta-usability-test.md) — TBD-5b 후속 task
