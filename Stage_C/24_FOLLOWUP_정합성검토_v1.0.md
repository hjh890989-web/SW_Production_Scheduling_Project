# 정합성 검토 후속 작업 메모 (코딩 진입 후 처리)

| 항목 | 내용 |
|---|---|
| 작성일 | 2026-06-01 |
| 작성자 | PM (InterCooler_Ha) + AI 페어 (Claude) |
| 배경 | 전 문서 정합성 검토(2026-06-01) 결과 식별된 13개 이슈 중 코딩 진입 전 처리한 10개 외, **코딩 진입 후 또는 외부 협의가 필요한 3건**을 본 메모로 보존 |
| 다음 검토 시점 | Sprint 5 진입 전 / PRD v1.5 개정 시 |

---

## 1. 코딩 진입 후 처리 (1주 ~ Sprint 4 종료까지)

### 1-A. PM-4 (자원 이상 시뮬) — 고아 AC 3건 일정 확정

- **현황**: PRD §3.5 PM-4-1·2·3는 P1 표기되어 있으나 WBS에 매핑된 task 없음
- **AC 내용**: 자원 이상 시뮬, 재계획, PDF 출력, 검증 실패, PM 중 가동
- **권장 조치**: PRD v1.5 개정 시 다음 중 택일
  - **옵션 A**: Sprint 12 P2로 명시적 배정 (T12.X 신규 추가)
  - **옵션 B**: Phase 2 별도 task로 분리 후 MVP 출시 후 처리
  - **옵션 C**: 출시 후 운영 데이터 누적 시 재검토 (현재 P1 표기 유지)
- **차단성**: MVP 차단 아님. 출시 후 안정성 보장 차원

### 1-B. PRD v1.4 §17 TBD 목록 갱신 → PRD v1.5

- **현황**: PRD v1.4 §17의 TBD-1·5 처리 결과가 본문에 미반영
- **반영 사항**:
  - TBD-1 (간트 라이브러리): T0.8(Sprint 0)에서 결정, ADR D-23 발행 예정
  - TBD-5 (반장 인터뷰): ADR D-22로 분할 종결 (5a 시뮬레이션 / 5b T5.12 사용성 테스트)
  - TBD-2/3/4/6: 미처리 상태 (아래 §2 참조)
- **추가 반영**: KSF-3 단위 이원화 ([ADR D-25](23_ADR_D25_KSF3단위명확화_v1.0.md))
- **권장 시점**: Sprint 4 완료 직후 PRD v1.5 일괄 개정

### 1-C. Stage_C Phase_C/Phase_D 표기 정합화 → PRD v1.5

- **현황**: PRD v1.0~v1.4 본문에 `Phase_C/`, `Phase_D/` 디렉토리명 잔존 (폴더 리네이밍 이전 작성 시점)
- **권장 조치**: PRD v1.5 개정 시 일괄 `Stage_C/`, `Stage_D/`로 치환
- **차단성**: 없음 (히스토리 보존, 신규 문서는 모두 Stage_*)

---

## 2. 외부 협의·미처리 TBD (Sprint 8 중반까지 해결 필수)

### 2-A. TBD-2 영림원 ERP API 사양

- **차단**: Sprint 10 (T10.1~T10.4) — 약 7주 후 도래
- **필요 액션**:
  - 영림원 ERP 담당자 지정 (사내 IT 또는 영업)
  - API 명세 수령: 품번 마스터 / BOM / 거래처 / 인증 방식 / Rate Limit
  - SELECT 전용 계정 발급
- **deadline**: Sprint 9 시작 전 (6주 차)
- **fallback**: 미수령 시 Mock ERP 패턴([.agents/skills/304-mock-erp-pattern](../.agents/skills/304-mock-erp-pattern/SKILL.md)) + Read-Only 가드([.agents/skills/301-erp-readonly-guard](../.agents/skills/301-erp-readonly-guard/SKILL.md))로 우선 진행, 실연동은 Phase 2 연기

### 2-B. TBD-3 자체 MES API 사양

- **차단**: Sprint 9 (T9.1~T9.6) — 약 6주 후 도래
- **필요 액션**:
  - 자체 MES 부서 stakeholder 공식 지정 (PM이 사내 요청)
  - API 명세: 실적 수집 엔드포인트, 작업지시 송신 형식, 인증, 폴링 vs Webhook 결정
  - 부하 시험 협의 (T11.2 k6 p95 ≤30초)
- **deadline**: Sprint 8 중반 (5주 차)
- **fallback**: Mock MES 인터페이스 구현, 실연동은 사양 확보 후 1주 추가 작업으로 처리

### 2-C. TBD-4 단가 4종 실측

- **차단**: ROI 정밀화·KPI 검증 — MVP 출시 가능 (필수 아님)
- **필요 데이터**: 라인 가동비, 인건비, OEM 페널티, 폐기량 단가
- **deadline**: 출시 전 1~2주 (사내 회계·구매팀 협조)
- **fallback**: 가정값(VPS v1.2 Proof-4)으로 운영, 실측 확보 시 KSF 자동 재계산

### 2-D. TBD-6 외부 OEM 벤치마크

- **차단**: VPS v1.3 보강 시에만 (선택)
- **필요 데이터**: 자동차부품 OEM 표준 99% 검증 (시장조사 1주)
- **권장 처리**: 임원 보고 시 필요 시 수집. 기술 개발에는 영향 없음

---

## 3. 처리 완료 확인 (참고)

코딩 진입 전 처리된 10건 (2026-06-01 커밋):

| # | 항목 | 처리 결과 |
|---|---|---|
| 1 | D-23 번호 충돌 | D-23(간트) / D-24(J-MR-2 재설계) / D-25(KSF-3) / D-26(LDAP) 분리 확정 |
| 2 | Skills 302/305 D8 위배 | `.archive/agents-skills-disabled/`로 격리 + README 명시 |
| 3 | KSF-3 단위 불일치 | [ADR D-25](23_ADR_D25_KSF3단위명확화_v1.0.md)로 이원화 (perceived 5분 / server 5초) |
| 4 | CLAUDE.md WBS v1.0 stale | WBS v1.1 인용으로 갱신 |
| 5 | CLAUDE.md 서브에이전트 5종 누락 | 9종 완전 표기 (도메인 4 + 스택 5) |
| 6 | .gitignore stale 3개 항목 | 삭제 |
| 7 | T0.1 Phase_C/ stale 경로 | Stage_C/19_PRD_v1.4.md / Stage_C/20_WBS_v1.1.md로 갱신 |
| 8 | conventional-commit.md WBS v1.0 | v1.1로 갱신 |
| 9 | .agents/rules/001~004 FactoryAI 템플릿 | EVS 도메인으로 4파일 일괄 재작성 |
| 10 | settings.local.json 외부 LLM 차단 부재 | 12개 deny 규칙 추가 (Gemini/OpenAI/Anthropic/HF/Cohere/Mistral + Vercel/Supabase) |

---

## 4. 다음 정합성 검토 트리거

- [ ] Sprint 5 진입 전 (TBD-5b T5.12 일정 확정)
- [ ] PRD v1.5 개정 직후 (위 §1 모두 반영 확인)
- [ ] Sprint 9·10 진입 전 (TBD-2·3 사양 확보 확인)
- [ ] MVP 출시 전 (PM-4 처리 옵션 확정)
