"""성형 CP-SAT 솔버 (T12.2.1).

룰 스케줄러(lib/scheduler/molding-scheduler.ts)와 **동일 불변식**:
  - 슬롯 위치 X(item.allowedSlots 밖)에는 절대 배치하지 않는다.
  - 모든 배치는 납품 D-2(영업일 기준) 마감까지.
  - 가류기 셀 용량(주/야 회전수)을 넘지 않는다.
  - 수요 미달 시 throw하지 않고 부분 배치 + warnings(부분성공).
목적: 총 배치 회전수 최대화(납기 충족 최대). 시간제한 내 최적/실행가능 해 반환.
"""
from __future__ import annotations

from math import ceil

from ortools.sat.python import cp_model

DAYNIGHTS = ("DAY", "NIGHT")


def schedule_molding(inp: dict) -> dict:
    orders = inp["orders"]
    items = inp["items"]
    equipment = [e for e in inp["equipment"] if e.get("isActive", True)]
    workdays = inp["workdays"]
    cap = {"DAY": int(inp["rotationsPerDay"]), "NIGHT": int(inp["rotationsPerNight"])}
    d2 = int(inp.get("d2Days", 2))
    wd_idx = {d: i for i, d in enumerate(workdays)}

    # 후보 셀: (date, daynight, equipmentCode, slot, equipmentType)
    cells: list[tuple[str, str, str, str, str]] = []
    for d in workdays:
        for dn in DAYNIGHTS:
            for eq in equipment:
                for slot in eq["slots"]:
                    cells.append((d, dn, eq["code"], slot, eq["type"]))

    model = cp_model.CpModel()
    x: dict[tuple[int, int], cp_model.IntVar] = {}
    needed: dict[int, int] = {}

    for oi, order in enumerate(orders):
        item = items.get(order["itemId"])
        if not item or item.get("moldsPerAngle", 0) <= 0 or not item.get("allowedSlots"):
            continue
        needed[oi] = ceil(order["quantity"] / item["moldsPerAngle"])
        # 납품일 이하 마지막 영업일 인덱스 - d2 = 마감 인덱스
        di = max((i for i, wd in enumerate(workdays) if wd <= order["deliveryDate"]), default=-1)
        deadline = di - d2
        if deadline < 0:
            continue
        for ci, (d, dn, _eqc, slot, etype) in enumerate(cells):
            if etype != item["equipmentType"]:
                continue
            if slot not in item["allowedSlots"]:  # 슬롯 X 금지(정확도 100%)
                continue
            if wd_idx[d] > deadline:  # D-2 초과 금지
                continue
            x[(oi, ci)] = model.NewIntVar(0, cap[dn], f"x_{oi}_{ci}")

    # 수요 제약: 주문별 배치 회전수 ≤ 필요 회전수
    for oi in needed:
        vs = [v for (o, _c), v in x.items() if o == oi]
        if vs:
            model.Add(sum(vs) <= needed[oi])

    # 용량 제약: 셀별 합 ≤ 주/야 회전수
    for ci, (_d, dn, _eqc, _slot, _et) in enumerate(cells):
        vs = [v for (_o, c), v in x.items() if c == ci]
        if vs:
            model.Add(sum(vs) <= cap[dn])

    model.Maximize(sum(x.values()) if x else 0)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(inp.get("maxSeconds", 25))
    status = solver.Solve(model)

    feasible = status in (cp_model.OPTIMAL, cp_model.FEASIBLE)
    assignments: list[dict] = []
    placed: dict[int, int] = {oi: 0 for oi in needed}
    if feasible:
        for (oi, ci), v in x.items():
            val = int(solver.Value(v))
            if val > 0:
                d, dn, eqc, slot, _et = cells[ci]
                assignments.append({
                    "itemId": orders[oi]["itemId"], "date": d, "daynight": dn,
                    "equipmentCode": eqc, "slot": slot, "rotations": val,
                    "orderId": orders[oi].get("orderId"),
                })
                placed[oi] += val

    warnings: list[str] = []
    for oi, order in enumerate(orders):
        tag = order.get("orderId") or order["itemId"]
        item = items.get(order["itemId"])
        if not item:
            warnings.append(f"{tag}: 품번 마스터 없음")
        elif oi not in needed:
            warnings.append(f"{tag}: 배치 불가(앵글당 금형수 0 또는 슬롯 없음)")
        elif placed.get(oi, 0) < needed[oi]:
            warnings.append(f"{tag}: 부분 배치 — {needed[oi] - placed.get(oi, 0)}회전 미달(D-2/용량 제약)")

    return {
        "engine": "solver",
        "assignments": assignments,
        "objective": int(solver.ObjectiveValue()) if feasible else 0,
        "warnings": warnings,
        "status": solver.StatusName(status),
    }
