# EVS 성형 솔버 (OR-Tools CP-SAT) — Phase 2 (T12.1/T12.2)

Python OR-Tools **CP-SAT** 마이크로서비스. 룰 스케줄러(`lib/scheduler/molding-scheduler.ts`)와 **동일 불변식**(슬롯 O/X · D-2 납기 · 가류기 용량 · 부분성공)을 제약/목적으로 구현한다. 사내망 전용 — 외부 LLM/SaaS 호출 없음(D8).

## 설치·실행 (사내 서버, Ubuntu 22.04)
```bash
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000   # 또는 docker(python:3.12-slim)
```

## 검증
```bash
pytest -v                                     # 단위(불변식)
curl localhost:8000/health                    # {"status":"ok","engine":"solver"}
curl -X POST localhost:8000/schedule/molding -H 'Content-Type: application/json' -d @sample.json
```

## 입력/출력
- **입력**: `{orders, items, equipment, workdays, rotationsPerDay, rotationsPerNight, d2Days}` (룰 스케줄러 `SchedulerInput`과 동형)
- **출력**: `{engine:"solver", assignments:[{itemId,date,daynight,equipmentCode,slot,rotations,orderId}], objective, warnings, status}`

## 연동
`lib/scheduler/solver-client.ts`(env `SOLVER_URL`)에서 `POST /schedule/molding` 호출. 현재는 Mock 귀결 — 이 서비스를 띄우고 실 HTTP 어댑터를 추가하면 Mock을 대체한다(T12.1.3). solver-client가 `/health` 200 확인 후에만 솔버 사용, 실패 시 룰 스케줄러로 fallback.

## 제약 요약 (CP-SAT)
| 불변식 | 구현 |
|---|---|
| 슬롯 위치 X 0건 | `slot ∈ item.allowedSlots`인 셀만 변수 생성 |
| D-2 납기 | `workday_idx(date) ≤ (납품일 영업일 idx − 2)` 셀만 |
| 가류기 용량 | `Σ_order x[*, cell] ≤ rotationsPerDay/Night` |
| 수요 | `Σ_cell x[order, *] ≤ ceil(qty / moldsPerAngle)` |
| 목적 | `Maximize Σ x` (납기 충족 최대), 시간제한 25s |

> ⚠️ 신규 의존성(`ortools` 등)·`solver/`·docker-compose·`.github/workflows` 변경은 인프라 적용 단계에서 별도 PR(자동 루프 제약과 분리). 이 디렉터리는 그 사전 산출물이다.
