# Sprint 0 Decision Log

본 파일은 `/goal` 자동화 루프(Sprint 0, T0.1~T0.8)에서 발생하는 모든 추가 의사결정을 기록합니다.

- **CORE**: 스택 변경, 외부 패키지 추가, 아키텍처
- **MINOR**: 폴더 구조, 네이밍, tsconfig 옵션, shadcn 컴포넌트 선택

카운터 줄은 grep 가능 형태로 유지됩니다.

CORE: 3
MINOR: 0

---

## 결정 목록

### CORE-1 (T0.1) — Next.js 수동 스캐폴딩 채택

- **결정**: `npx create-next-app@latest .` 사용 불가 → 수동 스캐폴딩으로 동등 구성
- **사유**: 프로젝트 루트 폴더명(`SW_Production_Scheduling_Project`)이 대문자를 포함하여 npm 패키지명 규칙 위배. create-next-app은 `path.basename(cwd)`을 패키지명으로 강제 사용하며 `--name` 옵션 미지원
- **대안 적용**: `package.json`에 `"name": "evs-scheduling"` (소문자 kebab-case) 명시 + Next.js 14+ 표준 의존성 수동 설치 + `next.config.js`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css` 모두 표준 템플릿 기준으로 작성
- **영향**: 기능적으로 create-next-app 결과와 동일. T0.1 AC(빌드/린트/dev 동작) 충족 가능
- **분류 사유**: 외부 패키지 설치 방식 변경 → CORE

### CORE-2 (T0.1) — Windows + 공백 경로에서 Next.js webpack EISDIR 차단 (블로커)

- **현상**: `npm run build` 실행 시 webpack의 `enhanced-resolve`가 일반 파일(`.tsx`, `.js`)에 `fs.readlinkSync`를 호출하면서 Windows + 공백 포함 경로(`E:\VS code Workbase\...`)에서 EISDIR 에러 발생
- **시도한 회피책 (4회 연속 실패)**:
  1. 초기 빌드 (Next.js 14.2.18) → EISDIR on `node_modules/next/dist/pages/_app.js`
  2. `.next` 캐시 삭제 후 재빌드 → 동일 에러
  3. Next.js 14.2.33 (최신 14.x 패치) 업그레이드 → 동일 에러
  4. `next.config.js`에 `config.resolve.symlinks = false` 추가 → EISDIR 위치만 `app/page.tsx`로 이동, 근본 원인 미해결
- **근본 원인**: Windows API와 Node.js의 readlink 동작이 공백 포함 경로에서 일치하지 않아 일반 파일을 디렉터리로 오인. Next.js·webpack 모두 외부 라이브러리(enhanced-resolve)에 의존하므로 사용자 코드에서 우회 불가
- **분류 사유**: 빌드 시스템 동작 불능 → CORE (블로커)
- **STOP REASON**: VERIFICATION_STUCK — Section 3에 따라 자동화 루프 즉시 종료
- **요구되는 사용자 결정 (블로커 해소 옵션)**:
  1. 저장소를 공백 없는 경로로 이동 (예: `E:\Workbase\EVS_Scheduling`) — 가장 확실
  2. Next.js를 Pages Router로 전환 (App Router 포기) — PRD §부록 A 충돌 가능성
  3. Linux/WSL2 또는 Docker 컨테이너에서 개발 — 사내망 정책과 충돌 검토 필요
  4. Vite + Express 등 다른 풀스택 조합 — PRD 스택 결정 D19 재논의 필요

---

### CORE-3 (T0.1) — 실제 근본 원인: Node.js v24 Windows readlink 버그 (블로커 확정)

- **현상 재현**: `node -e "require('fs').readlinkSync('app/page.tsx')"` → 일반 `.tsx` 파일에 `Error: EISDIR ... readlink 'E:\evs-build\app\page.tsx'` 발생
- **근본 원인**: Node.js v24.15.0의 Windows 구현에서 일반 파일에 `readlinkSync` 호출 시 EISDIR 반환 (Node v20 LTS는 EINVAL 반환이 정상). webpack의 `enhanced-resolve`가 이를 정상 처리하지 못함
- **CORE-2 가설 무효화**: 공백 경로(`E:\VS code Workbase\...`)가 원인이라 판단했으나, `git worktree`로 무공백 경로(`E:\evs-build`)에서도 동일 에러 발생. **공백은 무관**
- **시도한 회피책 (총 6회 실패)**:
  1~4. (CORE-2 참조)
  5. `git worktree add /e/evs-build` → 무공백 경로 빌드 시도 → 동일 EISDIR
  6. `node -e readlinkSync` 직접 호출로 Node 자체 문제 입증
- **확정 해소 경로**: Node.js v20 LTS 설치 (프로젝트 `.nvmrc=20`이 명시한 권장 버전)
  - nvm-windows 또는 https://nodejs.org/download/release/v20.18.0/ 직접 설치
  - 현재 시스템에는 `C:\Program Files\nodejs\node.exe` (v24)만 존재. nvm 미설치 확인됨
- **분류 사유**: 런타임 환경 변경 필요 → CORE (블로커, 사용자 액션 필요)

---

## 종료 기록

(루프 종료 시 STOP REASON 추가됨)

STOP REASON: VERIFICATION_STUCK
- 종료 사유: Node.js v24 Windows readlink 버그로 `npm run build` 6회 연속 실패
- 해소 조건: Node v20 LTS 설치 후 동일 `/goal` 재실행
- 목표 달성도: 5/5 검증 중 3/5 통과 (test/lint/typecheck) · 0/8 draft PR 생성 → **목표 미달성**

---

## 종료 기록

(루프 종료 시 STOP REASON 추가됨)
