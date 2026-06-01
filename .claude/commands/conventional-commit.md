---
description: Conventional Commits + Task ID 규약을 준수하는 커밋·푸시·드래프트 PR 자동화
argument-hint: [선택: 커밋 목적 요약 또는 Task ID]
allowed-tools: Bash, Read, Grep, Glob
---

# Conventional Commit Process (EVS)

커밋 목적: **$ARGUMENTS**

아래 순서를 따르며, **파괴적 명령(force push, reset --hard 등) 은 사용자 확인 없이 실행하지 않는다.**

## 1. 변경사항 검토
```bash
git status
git diff
git diff --cached
```
- 변경 내용을 카테고리별로 분류 (feat / fix / docs / refactor / test / chore / perf / build / ci).
- 서로 다른 목적의 변경이 섞여 있으면 분리 커밋을 계획.
- 본 프로젝트 산출물 파일(Stage_A~D/*.md)은 코드 변경과 **분리 커밋** (도큐멘트 vs 코드).

## 2. 브랜치 확인
- 현재 브랜치가 변경 목적과 일치하는지 확인.
- main에서 직접 작업 중이면 **단순 변경(docs, chore, hotfix)에 한정**. 그 외는 새 브랜치 생성:
  ```bash
  git checkout -b feat/T<task-id>-<short-description>
  ```
- 본 프로젝트 브랜치 명명 규칙: `<type>/T<task-id>-<kebab-case-summary>` (예: `feat/T0.1-nextjs-setup`).

## 3. 원자적 스테이징
```bash
git add -p   # hunk 단위 선택
# 또는 명시적 파일 지정
git add path/to/specific/file.ts
```
- `git add -A` / `git add .` 회피 — 실수로 `.env`·바이너리·임시 파일 포함 위험.
- 컴파일 불가능한 중간 상태 커밋 금지.

## 4. 커밋 메시지 (Conventional Commits + Task ID)

### 형식
```
<type>(<scope>): <subject>  [선택: T<task-id>]

<body — WHY 중심>

<footer — BREAKING CHANGE, Refs, Co-Authored-By>
```

### 본 프로젝트 규약
- `<type>`: `feat | fix | docs | refactor | test | chore | perf | build | ci`
- `<scope>`: 모듈 이름 (`orders`, `schedule`, `auth`, `prisma`, `infra`) — 선택
- `<subject>`: 명령형 현재시제, 한국어 또는 영어. 마침표 없음. 50자 이내.
- Task ID footer 권장: `Refs: T5.6` 또는 subject 끝에 `(T5.6)`
- 본문 WHY 중심 (WHAT은 diff가 말해줌).

### 예시
```
feat(schedule): 백워드 스케줄링 D-2/D-1 룰 적용 (T5.3)

월별 예상 수주의 납기일 기준으로 D-2 시점에 성형, D-1 시점에 검사가
완료되도록 역산 로직 추가. 47품번 실리콘 1차 도입 범위 한정.

Refs: T5.3
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

### 메시지 작성 명령 (heredoc)
```bash
git commit -m "$(cat <<'EOF'
feat(schedule): 백워드 스케줄링 D-2/D-1 룰 적용 (T5.3)

월별 예상 수주의 납기일 기준으로 D-2 시점에 성형, D-1 시점에 검사가
완료되도록 역산 로직 추가.

Refs: T5.3
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 5. 원격 푸시
```bash
git push -u origin <branch>
```
- 자격증명 누락 시 사용자에게 알리고 중단.
- **main 브랜치 직접 푸시는 사용자 명시 승인 필요** (CLAUDE 자동 차단됨).
- `--force` / `--force-with-lease` 는 사용자 명시 승인 후만.

## 6. Draft PR 생성 (선택)
```bash
gh pr create --draft --base main \
  --title "[<type>] <short title> (T<task-id>)" \
  --body "$(cat <<'EOF'
## Summary
- <변경 사항 요약>

## Related
- Task: [T<task-id>](Stage_D/issues/T<task-id>_<slug>.md)
- WBS: [Stage_C/20_WBS_v1.0.md](Stage_C/20_WBS_v1.0.md)

## Test Plan
- [ ] <test step 1>
- [ ] <test step 2>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## 주의 사항
- `main` / `master` 로의 force push 절대 자동 수행 금지.
- `--no-verify`, `--no-gpg-sign` 등 훅·서명 우회는 사용자가 명시 요청한 경우만.
- 이미 푸시된 커밋은 `amend` 대신 **새 커밋** 생성.
- 시크릿·비밀번호 우발 커밋 의심 시: 즉시 알리고, `git rm --cached` + rotate.
- 한글 폴더·파일명 포함 commit은 git이 octal-escape(`\353\214...`)로 표시 — 정상 동작.
