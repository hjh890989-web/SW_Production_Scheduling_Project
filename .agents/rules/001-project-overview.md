---
description: FactoryAI 프로젝트 개요·비전·핵심 페르소나 (항상 적용)
globs: ["**/*"]
alwaysApply: true
---

# 001 — Project Overview: FactoryAI

> **원천**: [`docs/1_RPD_V_1.0.md`](../../docs/1_RPD_V_1.0.md) PRD v7.0, [`docs/2_SRS_V_1.0.md`](../../docs/2_SRS_V_1.0.md) SRS v0.8

## Vision

국내 스마트공장 도입 기업의 **75.5%(≈24,038개사)**가 정체된 **「2차 자동화 공백(Second Automation Gap)」**을 해소하는 제조 AI 자동화 플랫폼.

> **인과 체인**: 정부 보급 → MES/ERP 기초 설치 → 현장 입력 거부(결측률 40%+) → 데이터 공백 → AI 고도화 불가(0.1%) → SPOF·감사 실패·사일로 반복

**4대 해법**:
1. **Zero-Touch 패시브 로깅** (STT + Vision)
2. **비파괴형 ERP 브릿지** (Read-Only)
3. **온프레미스 AI 패키지** (CISO 통과형)
4. **턴키 바우처 행정 대행** (자부담 80%↓)

## Core Features (MVP In-Scope)

| ID | Epic | 핵심 가치 |
|:---:|:---|:---|
| E1 | 패시브 로깅 (STT+Vision) | 현장 수기 입력 0건/일, 결측률 ≤5% |
| E2 | 원클릭 감사 리포트 (Lot Merge + PDF) | 감사 취합 48h+ → 30분 (90%↓) |
| E2-B | 품질 XAI 이상탐지 | AI 판단 한국어 시각화 |
| E3 | ERP 비파괴형 브릿지 (Mock MVP) | 수동 결합 월 40h+ → 0h |
| E4 | CFO ROI 진단·결재기 | Payback ≤18개월 증명 |
| E6 | 온프레미스 보안 패키지 | CISO 보안 심의 통과 |
| E7 | 성과 가시화·리텐션 대시보드 | NPS ≥50 |

**서비스 (SVC-1~5)**: 현장 온보딩, 바우처 턴키, 보안 심의 동행, 사후관리, 장애 출동.

## Target Audience

- **MVP 버티컬**: 금속가공·식품제조 2개 업종
- **PoC 규모**: 1개 고객사, 실 사용자 2~3명, 동시접속 최대 3명 (ASM-08)
- **DMU(의사결정단위) 5인**: COO → CFO+품질이사 → CISO 순 공략 (CISO 건너뛰면 무효)

| 페르소나 | 역할 | AOS |
|:---|:---|:---:|
| 한성우 (COO) | 현장 운영 총괄, 챔피언 | 4.0 |
| 클레어 리 (구매본부장) | 규제·감사 대응 | 4.0 |
| 차품질 (품질이사) | AI 판단 검증 | 3.0 |
| 정미경 (CIO) | ERP 인프라 | 3.2 |
| 이재무 (CFO) | 예산 승인 | 1.6 |
| 최보안 (CISO) | 보안 최종 관문 (단독 거부권) | 1.0 |

## Project Goals & Success Metrics

**🌟 북극성**: 바우처 연계 PoC 도입 동의서 확보 **6개월 내 4~6건**

| 보조 KPI | 목표 |
|:---|:---:|
| MES 데이터 결측치 | 40% → ≤5% |
| 감사 리포트 자동 생성 | ≥4건/분기 |
| CISO 보안 심의 승인 | 첫 3건 전수 통과 |
| MRR / 전체 매출 비중 | Year 2 말 30%+ |
| 바우처 선정률 | ≥80% |
| PoC→정식계약 전환율 | ≥60% |
| 현장 온보딩 (4주 이내) | ≥90% |

## Project Philosophy

- **데이터·현장 우선**: SRS는 진실의 원천. 추측보다 측정.
- **HITL First**: AI는 보조 도구, 인간이 결정.
- **무료 인프라 제약 수용**: 우아한 제약 = 우아한 설계.
- **턴키 의식**: 코드뿐 아니라 고객사 행정·심의 부담까지 흡수.

## See also

- [002-tech-stack.md](002-tech-stack.md)
- [003-development-guidelines.md](003-development-guidelines.md)
- [004-hitl-and-security.md](004-hitl-and-security.md)
