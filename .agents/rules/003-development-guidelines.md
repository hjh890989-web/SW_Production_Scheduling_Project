---
description: EVS 개발 표준·아키텍처 원칙·코드 스타일 (항상 적용)
globs: ["**/*"]
alwaysApply: true
---

# 003 — Development Guidelines

> **원천**: [`Stage_A/4_개발계획서_v1.3.md`](../../Stage_A/4_개발계획서_v1.3.md), [CLAUDE.md](../../CLAUDE.md) §3

## Version Control

- **System**: Git
- **Repository**: GitHub (https://github.com/hjh890989-web/SW_Production_Scheduling_Project)
- **브랜치 전략**: Trunk-based (단일 main) + 단기 feature 브랜치
- **커밋 규칙**: Conventional Commits + Task ID footer
  - 형식: `<type>(<scope>): <subject> (T<task-id>)`
  - 예: `feat(schedule): 백워드 D-2/D-1 룰 적용 (T5.3)` + `Refs: T5.3` footer
- **main 직접 push 정책**: 단순 변경(docs, chore, hotfix)만 허용. 그 외는 PR 권장

## Project Conventions

- **파일·폴더명**: 영문 소문자 + kebab-case (코드), 한글 + `_v1.0` 접미사 (Stage_A/B/C 산출물 문서)
- **Stage 산출물 in-place edit 금지** — `_v1.0` → `_v1.1` 새 파일 생성
  - 예외: Stage_D/issues/* 개별 task 명세서는 git 히스토리로 추적, in-place 가능
- **코드 폴더는 공백·한글 회피** — `backend/`, `frontend/`, `infra/`
- **한글 파일·폴더 인용 시 큰따옴표 필수** (`e:\VS code Workbase\...` 경로 대응)

## Architecture Principles

- **단일 Next.js 모노리포** (`app/`, `prisma/`, `lib/`, `infrastructure/`) — D19 하이브리드 스택
- **Server Component 우선**, Client Component는 인터랙션 필요한 경우만
- **DB 접근은 `lib/db.ts` 단일 진입점** (Prisma client 싱글톤)
- **비즈니스 규칙은 `lib/scheduling/` 도메인 모듈로 격리** (Next.js 의존 최소화 → 향후 OR-Tools 마이크로서비스 분리 대비)

## Code Style

- **TypeScript strict** 모드 전제. `any` 금지 (불가피하면 `unknown` + 좁히기)
- **함수 선언**: `const handleX = async () => {...}` 화살표 함수 + 명시적 타입
- **early return**으로 가독성 확보
- **Tailwind 클래스 우선** — CSS 파일/`<style>` 금지. 조건부는 `clsx` 또는 `cn` 헬퍼

## Code Comments

- **의미 있는 주석만 작성** (WHY 중심, WHAT은 코드로 표현)
- 사용되지 않거나 쓸모없어진 주석은 즉시 제거
- 한국어 주석 허용 (도메인 용어가 한국어 기반)

## Problem Solving

- 에러/예외 처리가 필요하면 **`/fix-error`** 슬래시 커맨드로 구조화된 7단계 진단
- 커밋·PR이 필요하면 **`/conventional-commit`** 커맨드 사용
- 새 의사결정은 [개발계획서 §15](../../Stage_A/4_개발계획서_v1.3.md)에 D-XX로 추가
- 새 요구사항은 [PRD](../../Stage_C/19_PRD_v1.4.md) 차기 버전(`_v1.5`)에 추가

## Sprint 진행 원칙

- WBS v1.1 = **117 Task** / 약 **662h** / MVP Must = 76 Task / 약 451h / 1인 8주
- Critical Path: T0.1 → T0.4 → T2.1 → T2.5 → T3.5 → T3.6 → T7.1 → T7.2 → T11.1 → T11.7 (약 6주)
- **Sprint 5 ⭐⭐ (성형 스케줄러 + J-MR-2)**: 도입 성패 결정 — T5.12 박철수 사용성 테스트 ≥4/5 필수
