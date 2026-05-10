# 사내 생산 스케줄링 시스템 — Issue 추출 프롬프트

| 항목 | 내용 |
|---|---|
| 문서명 | Issue 추출 프롬프트 (Task → 상세 Issue 명세서 변환) |
| 문서 번호 | 21 |
| 버전 | v1.0 |
| 작성일 | 2026-05-10 |
| Owner 팀 | 경영기획 본부 |
| 문서 성격 | **WBS의 Task를 GitHub Issue 형식 상세 명세서로 변환하는 프롬프트** |
| 입력 자료 | WBS #20 (Sprint별 Task 리스트), PRD #19 v1.4 (AC·NFR·기술 스택) |
| 출력 위치 | `Phase_D/issues/T{ID}_{slug}.md` |

---

# 1. 본 프롬프트 사용 방법

## 1.1 흐름

```
[1] WBS #20에서 Sprint 단위로 Task 선정 (5~10개 그룹)
[2] 본 프롬프트를 새 채팅 세션에 입력 + 대상 Task 그룹 명시
[3] 각 Task당 빈 마크다운 파일 먼저 생성 (Phase_D/issues/T{ID}_{slug}.md)
[4] 각 파일에 GitHub Issue Template 형식으로 상세 내용 작성
[5] 출력 검토 → 코딩 시작
```

## 1.2 산출물 위치 표준

```
Phase_D/issues/
├── T0.1_nextjs-project-setup.md
├── T0.2_tailwind-config.md
├── T0.3_shadcn-init.md
├── ...
├── T5.6_w4-drag-redistribute-jmr2.md      ← ⭐⭐ 채택 결정
├── ...
└── T12.7.4_ollama-cost-accuracy.md
```

## 1.3 명명 규칙

- **파일명**: `T{ID}_{kebab-case-slug}.md`
- **Issue Title**: `[Sprint {N}] T{ID}: {기능 요약 (한국어)}`
- 예: `[Sprint 5] T5.6: W-4 성형 간트 드래그·재배분 (J-MR-2 ⭐⭐)`

## 1.4 동시 작업 충돌 방지 (선택)

복수 AI/사람이 병렬 작업 시:
- **빈 파일이 이미 있으면 = 다른 작업자가 진행 중** → 건드리지 않음
- 작업 시작 시 빈 파일을 먼저 생성하여 "선점" 표시

---

# 2. ★ 본 프롬프트 (실제 사용 시 복사·붙여넣기)

> 아래 블록을 새 채팅 세션 또는 AI 에이전트에 그대로 입력. `{대상 Task 그룹}` 부분만 매번 교체.

```markdown
# Role
당신은 시니어 Full-Stack Engineer입니다.
사내 자동차부품 고무호스 제조사의 생산 스케줄링 시스템(Next.js + Tailwind + shadcn/ui + Prisma + 사내 PostgreSQL)을 AI 페어 코딩으로 직접 구현하는 프로젝트의 Task를 GitHub Issue 형태의 개발 명세서로 변환합니다.

# Context (반드시 먼저 Read/Evaluate)
- WBS: `Phase_C/20_WBS_v1.0.md` — 전체 Task 마스터 리스트
- PRD: `Phase_C/19_PRD_v1.4.md` — 14 Story + 70 AC + Prisma 스키마 + Server Action + NFR
- 개발계획서: `Phase_A/4_개발계획서_v1.3.md` — D1~D21 ADR
- VPS: `Phase_B/13_VPS_v1.2.md` — 가치 제안·Differential·Proof
- 폴더 구조: `Phase_D/issues/` (출력)

# Target Task Group
**{여기에 대상 Task ID 범위 기입. 예: G1 = T0.1 ~ T0.7 (Sprint 0 전체)}**

# Pre-execution Check
1. `Phase_D/issues/` 폴더의 기존 파일 목록 확인
2. **이미 존재하는 Task ID** = 다른 작업자가 진행 중 → 건드리지 않음
3. 빈 파일도 점유된 것으로 간주
4. 미생성 Task만 본 작업의 대상

# Execution Steps
**Step A**: 대상 Task 각각에 대해 빈 마크다운 파일을 먼저 생성
- 파일명: `Phase_D/issues/T{ID}_{kebab-slug}.md`
- 내용: 빈 파일 (1바이트 헤더 ` `만 있어도 OK)

**Step B**: 각 빈 파일에 아래 `GitHub Issue Template`을 엄격하게 따라 상세 내용 작성

# GitHub Issue Template (Strict Format — 본 프로젝트 버전)

\```markdown
---
name: Feature Task
about: PRD #19 기반 구체적 개발 태스크 명세
title: "[Sprint {N}] T{ID}: {기능 요약}"
labels: 'priority:{must|should|could}, area:{frontend|backend|db|infra|test}, sprint:{N}, persona:{pm|molding-leader|extrusion-leader|sales|exec|admin}'
assignees: ''
---

## 🎯 Summary
- **Task ID**: T{ID}
- **기능명**: [F-{N.M}] 또는 [J-{ID}] {간결한 기능명}
- **목적**: {한 문장으로 비즈니스 가치}
- **MoSCoW**: Must / Should / Could
- **예상 시간**: {h}시간

## 🔗 References (Spec & Context)
> 💡 작업 시작 전 아래 문서 섹션을 반드시 먼저 Read/Evaluate 할 것.

- **PRD 문서**: `Phase_C/19_PRD_v1.4.md`
- **사용자 스토리**: PRD §3.{X} — Story {J-ID}
- **수용 기준 (AC)**: PRD §3.{X} — AC {ID-1}, AC {ID-2}, AC {ID-F1} 등
- **데이터 모델**: PRD §6.1 (Mermaid ERD) + 부록 C ({관련 Prisma 모델})
- **API 명세**: PRD §6.3 + 부록 F ({관련 Server Action})
- **비즈니스 로직**: PRD §8 + 부록 G ({관련 알고리즘})
- **NFR**: PRD §5 ({관련 임계치})
- **WBS Task**: `Phase_C/20_WBS_v1.0.md` Sprint {N}
- **관련 ADR**: 개발계획서 §15.1 D-{X}

## ✅ Task Breakdown (실행 계획)
- [ ] {세부 작업 1 — 구체적 파일·함수 명시}
- [ ] {세부 작업 2}
- [ ] {세부 작업 3}
- [ ] {... 4~7개 권장}

## 🧪 Acceptance Criteria (BDD/GWT)

> PRD §3에서 인용. 추가 AC 필요 시 본 Issue에서 정의.

### {Story 제목} — {J-ID}

#### AC {ID-1} (정상)
- **Given**: {상황}
- **When**: {행위}
- **Then**: {결과 + 정량 임계치}

#### AC {ID-2} (정상)
- ...

#### 🔥 AC {ID-F1} (실패/예외)
- **Given**: {예외 상황}
- **When**: {행위}
- **Then**: {예외 처리 + audit 기록}

## ⚙️ Technical & Non-Functional Constraints
- **성능**: {p95 ≤ XXms, PRD §5.1 인용}
- **신뢰성**: 오류율 ≤ 0.5%, 가용성 ≥ 99% (PRD §5.2)
- **보안**: {RBAC·audit·Zod 등 해당 항목 명시}
- **컴플라이언스**: AuditLog 5년 보존 (변경 작업 시 R-13)
- **사용 금지**: Vercel·Supabase·외부 LLM API (D8·D19)
- **Cloud-Ready**: {해당 시 — 환경변수, 인터페이스 추상화 등}

## 🏁 Definition of Done (DoD)
- [ ] **AC 모든 시나리오 충족** (정상 + 실패 모두)
- [ ] **Vitest 단위 테스트** 추가 (비즈니스 로직 — 해당 시)
- [ ] **Playwright E2E** 추가 (UI 흐름 — 해당 시)
- [ ] **ESLint + Prettier + `tsc --noEmit`** 통과
- [ ] **Prisma 마이그레이션** 추가 + 검증 (DB 변경 시)
- [ ] **Server Action 타입 + JSDoc** 업데이트
- [ ] **AuditLog 자동 기록** 동작 확인 (변경 작업 시)
- [ ] **PRD §3 해당 AC ID 모두 cover**
- [ ] **README 또는 관련 문서** 업데이트 (해당 시)

## 🚧 Dependencies & Blockers
- **Depends on (선행)**: T{X.Y.Z} (이슈 #{N}) — {간단 사유}
- **Blocks (후행)**: T{X.Y.Z} (이슈 #{N})
- **외부 의존**: {TBD-1 간트 라이브러리 등 해당 시}

## 📝 Implementation Notes (선택)
{구현 팁·트레이드오프·주의사항·참고 라이브러리 등}

## 🔍 Out of Scope (이 Issue에 포함되지 않음)
- {다른 Task에서 처리 — 명시}
\```

# Output Quality Bar

- 모든 AC는 PRD §3에서 인용하되, 해당 Task에 직접 관련된 AC만 포함
- 정량 임계치는 모두 PRD §5 NFR과 일치
- Task Breakdown은 4~7개, 각각 구체적 파일/함수/명령어 명시
- DoD 모든 항목은 자동 검증 가능 (CI 통합 가능)
- 각 Issue 분량: 약 100~200줄 (너무 짧으면 정보 부족, 너무 길면 가독성 ↓)

# Output

Phase_D/issues/T{ID}_{slug}.md 파일 N개를 위 템플릿에 따라 작성.
완료 후 작성한 파일 목록과 핵심 의존성 관계를 한 줄씩 요약.
```

---

# 3. 사용 예시 (G1: Sprint 0 추출)

새 채팅 세션에 위 §2 프롬프트 블록을 입력하고 `{Target Task Group}` 부분에 다음 기입:

```
# Target Task Group
G1 = Sprint 0 전체 (7 Task)
- T0.1 Next.js 프로젝트 생성
- T0.2 Tailwind 4 설정
- T0.3 shadcn/ui 초기화
- T0.4 Prisma + SQLite 셋업
- T0.5 Auth.js v5 골격
- T0.6 Docker 환경
- T0.7 Sprint 0 검증

WBS #20 §2 참조.
```

→ AI가 7개 빈 파일 생성 → 각각 상세 명세 작성 → 출력.

---

# 4. WBS와의 매핑 (Issue 추출 그룹 14~15회)

WBS #20 §23 참조.

| 그룹 | Task 범위 | 산출 Issue 수 | 우선순위 |
|---|---|---|---|
| **G1** | Sprint 0 (T0.1~T0.7) | 7 | Must |
| G2 | Sprint 1 (T1.1~T1.8) | 8 | Must |
| G3 | Sprint 2 (T2.1~T2.9) | 9 | Must |
| G4 | Sprint 3 (T3.1~T3.9) | 9 | Must |
| G5 | Sprint 4 (T4.1~T4.6) | 6 | Must |
| **G6** ⭐⭐ | Sprint 5 전반 (T5.1~T5.5) | 5 | Must |
| **G7** ⭐⭐ | **Sprint 5 후반 (T5.6~T5.11) — J-MR-2 핵심** | 6 | Must |
| G8 | Sprint 6 (T6.1~T6.7) | 7 | Must |
| G9 | Sprint 7+8 (T7.1~T8.4) | 9 | Must |
| G10a | Sprint 9 (T9.1~T9.6) | 6 | Should |
| G10b | Sprint 10 (T10.1~T10.4) | 4 | Should |
| G10c | Sprint 11 (T11.1~T11.8) | 8 | Must |
| G11a | Sprint 12.1+12.2 (T12.1.1~T12.2.5) | 9 | Could |
| G11b | Sprint 12.3+12.4 (T12.3.1~T12.4.4) | 8 | Could |
| G11c | Sprint 12.5+12.6+12.7 (T12.5.1~T12.7.4) | 14 | Could |

**총 14회 추출 작업**으로 115 Task 모두 Issue화.

---

# 5. Issue 명세서 검토 체크리스트

각 Issue 추출 후 다음 항목 자체 점검:

| # | 점검 항목 | 통과 기준 |
|---|---|---|
| 1 | Title 형식 일치 | `[Sprint {N}] T{ID}: {요약}` |
| 2 | Labels 4개 모두 (priority·area·sprint·persona) | 누락 없음 |
| 3 | References 8개 모두 명시 | PRD·WBS·ADR 링크 |
| 4 | Task Breakdown 4~7개 | 각 항목 구체 |
| 5 | AC 정상 + 실패 모두 인용 | PRD §3에서 |
| 6 | NFR 임계치 정량 | PRD §5와 일치 |
| 7 | DoD 9개 모두 | 자동 검증 가능 |
| 8 | 의존성 (선·후행) 명시 | WBS와 일치 |
| 9 | 분량 100~200줄 | 너무 짧거나 길지 않음 |
| 10 | 사용 금지 명시 | Vercel/Supabase/외부 LLM 거부 |

---

# 6. 흔한 실수 방지

| 실수 | 회피 방법 |
|---|---|
| AC를 새로 만들기 | PRD §3에서 인용. 새 AC는 "보강 사항" 섹션으로 |
| Title에 한국어/영문 혼용 | 한국어 통일 (Issue 검색 일관성) |
| 의존성 누락 | WBS §22 Mermaid 다이어그램 확인 |
| Server Action 시그니처 모호 | PRD §6.3 / 부록 F 그대로 인용 |
| Prisma 모델 추측 | 부록 C 그대로 인용 (필드 이름 정확히) |
| "Swagger 명세 갱신" 같은 부적합 DoD | 본 템플릿 DoD 9개 그대로 사용 |
| 외부 LLM API 호출 추천 | 명시적으로 사용 금지 |

---

# 7. 변경 이력

| 버전 | 일자 | 내용 | 작성자 |
|---|---|---|---|
| v1.0 | 2026-05-10 | Issue 추출 프롬프트 최초 작성. 본 프로젝트 스택(Next.js+Tailwind+shadcn+Prisma)·DoD·Labels·References 모두 반영. 14회 추출 그룹 정의. | 경영기획 본부 |

---

**[문서 끝 — Issue 추출 프롬프트 v1.0]**
