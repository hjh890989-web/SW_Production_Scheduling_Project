"""압출 CP-SAT 솔버 (T12.2.2).

룰 스케줄러(lib/scheduler/extrusion-scheduler.ts)와 동일 불변식 + KSF-2 목적:
  - 압출기(FORD/NEW) 호환만 배치(item.extruderFord / extruderNew).
  - 관체 deadline(성형투입 D-1) 이내.
  - 근무 셀 용량(shiftCapacity * efficiency) 준수.
  - (extrusionGroup, headPin) 그룹을 같은 압출기에 모아 다이/노즐 변경 최소화.
  - 수요 미달 시 부분 배치 + warnings(부분성공).
목적: 1순위 배치량 최대(납기), 2순위 그룹별 사용 압출기 수 최소(다이/노즐 변경 ↓).
"""
from __future__ import annotations

from math import floor

from ortools.sat.python import cp_model

DEFAULT_SHIFTS = ("DAY_FIRST", "DAY_SECOND", "NIGHT_FIRST", "NIGHT_SECOND")


def schedule_extrusion(inp: dict) -> dict:
    pipe = inp["pipeRequests"]
    items = inp["items"]
    extruders = [e for e in inp["extruders"] if e.get("isActive", True)]
    workdays = inp["workdays"]
    shifts = inp.get("shifts", list(DEFAULT_SHIFTS))
    cap = max(1, floor(int(inp["shiftCapacity"]) * float(inp["efficiency"])))
    wd_idx = {d: i for i, d in enumerate(workdays)}

    # 후보 셀: (date, shift, extruderCode)
    cells: list[tuple[str, str, str]] = []
    for d in workdays:
        for s in shifts:
            for e in extruders:
                cells.append((d, s, e["code"]))

    model = cp_model.CpModel()
    x: dict[tuple[int, int], cp_model.IntVar] = {}
    needed: dict[int, int] = {}

    for pi, pr in enumerate(pipe):
        item = items.get(pr["itemId"])
        if not item:
            continue
        needed[pi] = int(pr["pipeQuantity"])
        di = max((i for i, wd in enumerate(workdays) if wd <= pr["extrusionDeadline"]), default=-1)
        if di < 0:
            continue
        for ci, (d, _s, ec) in enumerate(cells):
            if ec == "FORD" and not item.get("extruderFord"):
                continue
            if ec == "NEW" and not item.get("extruderNew"):
                continue
            if wd_idx[d] > di:  # D-1 초과 금지
                continue
            x[(pi, ci)] = model.NewIntVar(0, cap, f"x_{pi}_{ci}")

    # 수요: 관체요청별 배치 ≤ 필요 본수
    for pi in needed:
        vs = [v for (p, _c), v in x.items() if p == pi]
        if vs:
            model.Add(sum(vs) <= needed[pi])
    # 용량: 셀별 합 ≤ 근무 용량
    for ci in range(len(cells)):
        vs = [v for (_p, c), v in x.items() if c == ci]
        if vs:
            model.Add(sum(vs) <= cap)

    # 그룹-압출기 binding: 같은 (group, headPin)을 가능한 한 한 압출기로 → 다이/노즐 변경 최소화
    def gkey(pi: int) -> tuple:
        it = items[pipe[pi]["itemId"]]
        return (it.get("extrusionGroup"), it.get("headPin"))

    y: dict[tuple[tuple, str], cp_model.IntVar] = {}
    for (pi, ci), var in x.items():
        gk = gkey(pi)
        _d, _s, ec = cells[ci]
        if (gk, ec) not in y:
            y[(gk, ec)] = model.NewBoolVar(f"y_{gk}_{ec}")
        model.Add(var <= cap * y[(gk, ec)])  # 배치 시 그 압출기 사용 플래그 on

    big = (sum(needed.values()) + 1) if needed else 1
    model.Maximize(big * (sum(x.values()) if x else 0) - sum(y.values()))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(inp.get("maxSeconds", 25))
    status = solver.Solve(model)
    feasible = status in (cp_model.OPTIMAL, cp_model.FEASIBLE)

    assignments: list[dict] = []
    placed: dict[int, int] = {pi: 0 for pi in needed}
    if feasible:
        for (pi, ci), var in x.items():
            val = int(solver.Value(var))
            if val > 0:
                d, s, ec = cells[ci]
                it = items[pipe[pi]["itemId"]]
                assignments.append({
                    "itemId": pipe[pi]["itemId"], "date": d, "shift": s, "extruderCode": ec,
                    "quantity": val, "extrusionGroup": it.get("extrusionGroup"), "headPin": it.get("headPin"),
                    "orderId": pipe[pi].get("orderId"),
                })
                placed[pi] += val

    warnings: list[str] = []
    for pi, pr in enumerate(pipe):
        tag = pr.get("orderId") or pr["itemId"]
        if pr["itemId"] not in items:
            warnings.append(f"{tag}: 품번 마스터 없음")
        elif pi not in needed:
            warnings.append(f"{tag}: 배치 불가")
        elif placed.get(pi, 0) < needed[pi]:
            warnings.append(f"{tag}: 부분 배치 — {needed[pi] - placed.get(pi, 0)}본 미달(D-1/용량/압출기 제약)")

    return {
        "engine": "solver",
        "assignments": assignments,
        "objective": int(solver.ObjectiveValue()) if feasible else 0,
        "warnings": warnings,
        "status": solver.StatusName(status),
    }
