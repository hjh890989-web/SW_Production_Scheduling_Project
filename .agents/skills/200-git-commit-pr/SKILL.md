---
name: 200-git-commit-pr
description: Git Flow + Conventional Commits + Draft PR 자동화 절차. FactoryAI 저장소 (GitHub) 커밋·푸시·PR 단계별 가이드.
---

# 200 — Git Commit & PR Workflow

> Claude/Cursor/Antigravity/Gemini 모든 도구에서 동일 절차로 사용. Claude Code는 `.claude/skills/` Junction을 통해 본 SKILL.md를 `/200-git-commit-pr` 슬래시 커맨드로 호출.

---

## 0. 황금 규칙

- **한 커밋 = 한 논리 단위** (atomic).
- **WHY를 본문에 적는다**. WHAT은 diff가 말해준다.
- **파괴적 명령은 사용자 확인 없이 실행하지 않는다** (`reset --hard`, `push --force`, `branch -D`).
- **`main` 직접 푸시 금지** — 항상 PR 경유 (1인 개발이라도 self-review).

---

## 1. 변경사항 검토

```bash
git status
git diff
git diff --cached
```

- 변경 내용을 카테고리별로 분류 (feat / fix / docs / refactor / test / chore / perf / style).
- 서로 다른 목적이 섞여 있으면 **분리 커밋** 계획.

## 2. 브랜치 확인·정렬

```bash
git branch --show-current
```

- 현재 브랜치가 변경 목적과 일치하는지 확인.
- 불일치 시:

```bash
git checkout -b feat/TASK-42-add-audit-pdf-export
# 또는
git checkout -b fix/login-session-undefined
```

브랜치 prefix 규칙:
- `feat/` — 새 기능
- `fix/` — 버그 수정
- `hotfix/` — 긴급 패치 (main 직접 분기)
- `refactor/` — 리팩터링
- `docs/` — 문서
- `chore/` — 빌드/설정/의존성
- `test/` — 테스트
- `release/` — 릴리스 준비

## 3. 원자적 스테이징

```bash
git add -p              # hunk 단위 선택
# 또는
git add app/(dashboard)/audit/page.tsx components/features/AuditPdfButton.tsx
```

- 무관한 변경 섞지 않기.
- 컴파일 불가능한 중간 상태 커밋 금지.

## 4. Conventional Commit 메시지

```
<type>(<scope>): <subject>

<body — WHY와 맥락>

<footer — BREAKING CHANGE, Closes #N, Refs FR-XXX>
```

예:

```
feat(audit): add client-side PDF export for daily audit reports

CON-07 / ASM-09 강제 — Vercel Serverless 10초 한도 회피를 위해
@react-pdf/renderer 브라우저 모드로 구현. A4 + 20mm 여백 + Pretendard
폰트 등록으로 정부 양식 호환성 확보.

Closes #42
Refs FR-E2-003
```

### Type 표

| type | 사용처 |
|:---|:---|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `chore` | 빌드/설정/의존성 |
| `docs` | 문서 |
| `refactor` | 리팩터링 (동작 변화 없음) |
| `test` | 테스트 추가/수정 |
| `perf` | 성능 개선 |
| `style` | 포매팅 (no logic) |

## 5. 푸시

```bash
git ls-remote                  # 자격증명 확인
git push -u origin <branch>
```

- 자격증명 없으면 사용자에게 알리고 멈춤.
- 첫 푸시는 `-u`로 upstream 설정.

## 6. Draft PR 생성

```bash
gh pr create --draft --base main \
  --title "feat(audit): add client-side PDF export" \
  --body "$(cat <<'EOF'
## Summary
- CON-07 / ASM-09 — Vercel Serverless 10s 회피
- @react-pdf/renderer 브라우저 모드
- 정부 양식 호환 (A4 + 20mm + Pretendard)

## Related
- FR-E2-003 (감사 리포트 PDF 출력)
- ADR-9 (클라이언트 사이드 무거운 연산)

## Test Plan
- [ ] dev 서버에서 PDF 다운로드 정상 동작
- [ ] 한글 폰트 정상 렌더링 (□□□ 없음)
- [ ] 50페이지 리포트도 끊김 없음
- [ ] \`npm run build\` 통과 (SSR 에러 없음)
- [ ] HITL 영향 — AI 결과 PDF에 포함 시 PENDING 상태 표시

## Screenshots
(브라우저 PDF preview 캡처)

## Risk
- 사용자 디바이스가 약하면 50페이지+ 생성 시 응답 지연 — 진행률 UI로 완화

EOF
)"
```

## 7. PR 셀프 체크리스트

PR 본문에 또는 별도 review로:

- [ ] SRS 요구사항 ID (FR-XXX) 인용
- [ ] 빌드 통과 (`npm run build`)
- [ ] 타입 통과 (`tsc --noEmit`)
- [ ] Lint 통과 (`npm run lint`)
- [ ] (해당 시) 테스트 작성·통과
- [ ] **HITL 영향 검토** — AI 출력 노출 시 PENDING 상태 보장
- [ ] **RBAC 가드** — Server Action / Route Handler 첫 줄 `requireRole`
- [ ] **ERP Read-Only** — ERP 모델 write 호출 0건
- [ ] **무료 티어** — Vercel 10s / Supabase 500MB / Gemini 15RPM 한도 영향 없음
- [ ] 비밀키 노출 없음 (`git diff` 점검)
- [ ] 변경 이력 주석/console.log/debugger 제거

## 8. 머지 정책

- 1인 개발이라도 **24시간 cool-down** 권장 (오류 발견 기회).
- `main` 머지 후 즉시 Vercel auto-deploy → preview에서 검증 후 production 승급.
- 머지 방식: **Squash and merge** (히스토리 깔끔).

## 주의

- `main` / `master` force push 자동 수행 절대 금지.
- `--no-verify`, `--no-gpg-sign` 사용자 명시 요청 시에만.
- 이미 푸시된 커밋은 amend 대신 **새 커밋**.
- 비밀키 실수 커밋 시: 즉시 키 재발급 + history 제거 (BFG 또는 `git filter-repo`).

---

## See also

- [.agents/rules/003-development-guidelines.md](../../rules/003-development-guidelines.md) §4 (Version Control)
