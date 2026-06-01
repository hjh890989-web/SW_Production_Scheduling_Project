---
description: EVS 사내 생산 스케줄링 시스템 — 프로젝트 개요·비전·핵심 페르소나 (항상 적용)
globs: ["**/*"]
alwaysApply: true
---

# 001 — Project Overview: EVS (Extrusion & Vulcanization Scheduling)

> **원천 문서**: [`Stage_A/4_개발계획서_v1.3.md`](../../Stage_A/4_개발계획서_v1.3.md) (Single Source of Truth), [`Stage_C/19_PRD_v1.4.md`](../../Stage_C/19_PRD_v1.4.md), [`Stage_C/20_WBS_v1.1.md`](../../Stage_C/20_WBS_v1.1.md)

## Vision

송우산업(주)의 자동차부품 고무호스 제조 공정에서 **수주 통합 → 압출·성형 스케줄링 → MES 연동**을 자동화하여 납기 준수율을 높이고 공정 손실(금형 교체·다이스/노즐 변경·셋업)을 최소화하는 **사내 생산 스케줄링 시스템**.

> **핵심 가치제안**: 베테랑이 며칠 걸려도 못 푸는 스케줄링 퍼즐을, 시스템이 5초 안에 초안을 만들고 베테랑은 검토·수정만 한다.

## Core Features (F-1 ~ F-8)

| ID | 기능 | 핵심 가치 |
|:---:|:---|:---|
| F-1 | 수주 통합 | 월예상/KD/주간발주 엑셀 3종 → 단일 통합 DB |
| F-2 | 자동 백워드 스케줄링 | D-2/D-1 룰 자동 보장 |
| F-3 | 수동 보정 UI (T5.6 J-MR-2 ⭐⭐) | 드래그·재배분, **도입 성패 결정 task** |
| F-4 | 변경 영향 시뮬레이션 | 4시간 → 5분 / 서버 ≤5초 (KSF-3a/b, [ADR D-25](../../Stage_C/23_ADR_D25_KSF3단위명확화_v1.0.md)) |
| F-5 | MES 연동 | 자체 MES 작업실적 자동 동기화 |
| F-6 | 영림원 ERP 연동 | 수주 헤더 마스터 |
| F-7 | 통합 대시보드 · 알림 | |
| F-8 | Excel/PDF 출력 | |

## Target Audience

- **Primary users (사내 약 20명)**: 생산관리팀, 성형/압출 반장, 영업·수주팀, 자재구매팀
- **Secondary users**: 경영진(KPI 대시보드 열람), MES/ERP 시스템(API 통신)
- **1차 도입 범위**: 실리콘 47품번. EPDM/NBR은 Sprint 12.6 확대

## 핵심 페르소나 (6 Role, RBAC)

| 페르소나 | 역할 (RBAC) | 핵심 Job |
|:---|:---|:---|
| 김민수 (P1, 7년차) | PRODUCTION_MANAGER | J-PM-1 변동 영향 5분 시뮬 |
| **박철수 (P2, 15년차)** | **MOLDING_LEADER** | **J-MR-2 ⭐⭐ 드래그·재배분 (도입 성패)** |
| 이영호 (P3, 10년차) | EXTRUSION_LEADER | J-ER-1 E그룹·헤드핀 자동 묶음 |
| 정수진 (P4) | SALES_PURCHASE | J-SP-1 통합 4h→1.5h |
| 한사라 (P5, 18년차) | PRODUCTION_MANAGER | 주간 보고서 3h→30분 |
| 강복철 (P11, 55세) | EXECUTIVE (R/O) | KPI 대시보드 Before/After |

## 핵심 KPI (KSF — VPS v1.2)

| KSF | 목표 |
|:---:|:---|
| KSF-1 | 납기율 93% → ≥99% |
| KSF-2 | 다이/금형 변경 -30% |
| KSF-3a (perceived) / KSF-3b (server) | 변동 영향 4h → ≤5분 / 서버 응답 ≤5초 p95 |
| KSF-4 | 스케줄링 24h/주 → -50% |
| KSF-5 | 데이터 일원화 0 → 100% |
| KSF-6 | **시스템 채택률 ≥90%** (박철수 페르소나 검증) |

## Project Philosophy

- **점진 확대형**: 실리콘 47품번 → 검증 후 EPDM/NBR
- **자동 + 수동 보정** ([D-10](../../Stage_A/4_개발계획서_v1.3.md)): 자동 강제 X, 현장 반장 수동 보정 권한 절대 보장
- **사내망 전용** ([D-8](../../Stage_A/4_개발계획서_v1.3.md)): 외부 LLM·SaaS 금지 (영업비밀·OEM NDA)
- **Cloud-Ready** ([D-20](../../Stage_A/4_개발계획서_v1.3.md)): 12-Factor 준수, 향후 클라우드 이전 옵션 보존

## See also

- [002-tech-stack.md](002-tech-stack.md)
- [003-development-guidelines.md](003-development-guidelines.md)
- [004-hitl-and-security.md](004-hitl-and-security.md)
