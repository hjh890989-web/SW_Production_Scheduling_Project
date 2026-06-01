# Sprint 0 Decision Log

본 파일은 `/goal` 자동화 루프(Sprint 0, T0.1~T0.8)에서 발생하는 모든 추가 의사결정을 기록합니다.

- **CORE**: 스택 변경, 외부 패키지 추가, 아키텍처
- **MINOR**: 폴더 구조, 네이밍, tsconfig 옵션, shadcn 컴포넌트 선택

카운터 줄은 grep 가능 형태로 유지됩니다.

CORE: 2
MINOR: 0

---

## 결정 목록

### CORE-1 (T0.1) — Next.js 수동 스캐폴딩 채택 [유효]

- **결정**: `npx create-next-app@latest .` 사용 불가 → 수동 스캐폴딩으로 동등 구성
- **사유**: 프로젝트 루트 폴더명에 대문자 포함 → npm 패키지명 규칙 위배. create-next-app은 `--name` 옵션 미지원
- **대안 적용**: `package.json` name=`evs-scheduling` + 표준 Next.js 14+ 구성 수동 작성
- **영향**: create-next-app과 동일한 기능적 결과

### ~~CORE-2~~ Windows + 공백 경로 EISDIR 가설 — **INVALIDATED**

- git worktree로 무공백 경로(`E:\evs-build`)에서 빌드 시도 → 동일 EISDIR 발생
- 결론: 공백 경로는 원인이 아님

### ~~CORE-3~~ Node.js v24 readlink 버그 가설 — **INVALIDATED**

- Node v20.18.0 설치 후 동일 위치(E: 드라이브)에서 동일 EISDIR 발생
- 결론: Node 버전은 원인이 아님

### CORE-4 (T0.1) — **실제 근본 원인 확정: exFAT 파일시스템 + NTFS 마이그레이션 결정**

**진단 종합**:
| 환경 | 결과 |
|---|---|
| E:\VS code Workbase\... (공백) + Node v24 | ❌ EISDIR |
| E:\evs-build (무공백, worktree) + Node v24 | ❌ EISDIR |
| E:\evs-build + Node v20 | ❌ EISDIR |
| C:\Users\sw174\evs-test + Node v20 | ✅ **빌드 성공** |

**근본 원인**:
`fsutil fsinfo volumeinfo E:` 결과 — E: 드라이브는 **Samsung T7 Touch 외장 SSD에 exFAT 파일시스템**.

exFAT는 다음을 미지원:
- 심볼릭 링크 / junction / reparse point
- POSIX 파일 메타데이터 (`ctime: 2009-04-22` 비정상값이 단서)

Next.js webpack의 `enhanced-resolve`는 일반 파일에 `readlinkSync`를 호출하는데, exFAT에서 Windows API가 EISDIR 반환 → 빌드 차단.

**해소 결정**: 정식 작업 위치를 **`C:\Users\sw174\evs-scheduling`** (NTFS)로 마이그레이션.
- git clone으로 새 위치 확보 (모든 git history·branch 동기화)
- E:\VS code Workbase\... 원본은 git remote 동일하므로 백업·참조용으로 보존 가능
- E:\evs-build worktree는 더 이상 빌드 불가 — 사용자 정리 결정

**분류 사유**: 작업 파일시스템 변경 → CORE (인프라)

---

## 종료 기록

(루프 종료 시 STOP REASON 추가됨 — 현재 진행 중)
