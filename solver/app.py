"""EVS 성형 솔버 마이크로서비스 (T12.1 — FastAPI + OR-Tools CP-SAT).

실행: uvicorn app:app --host 0.0.0.0 --port 8000
연동: lib/scheduler/solver-client.ts (env SOLVER_URL)에서 POST /schedule/molding.
사내망 전용 — 외부 LLM/SaaS 호출 없음(D8).
"""
from __future__ import annotations

from fastapi import FastAPI

from solver_molding import schedule_molding

app = FastAPI(title="EVS Molding Solver", version="0.1.0")


@app.get("/health")
def health() -> dict:
    """헬스체크 — solver-client가 200 확인 후에만 솔버 사용(아니면 룰 fallback)."""
    return {"status": "ok", "engine": "solver"}


@app.post("/schedule/molding")
def molding(payload: dict) -> dict:
    """성형 스케줄 — 룰 스케줄러와 동일 불변식(슬롯 O/X·D-2·용량·부분성공)."""
    return schedule_molding(payload)
