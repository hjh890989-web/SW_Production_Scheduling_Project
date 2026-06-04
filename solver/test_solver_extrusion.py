"""압출 CP-SAT 솔버 단위 테스트 (T12.2.2) — 룰 스케줄러 불변식 검증."""
from __future__ import annotations

from solver_extrusion import schedule_extrusion

WORKDAYS = ["2026-05-18", "2026-05-19", "2026-05-20", "2026-05-21", "2026-05-22"]


def base(**over) -> dict:
    inp = {
        "pipeRequests": [{"itemId": "I1", "productCode": "P1", "extrusionDeadline": "2026-05-21", "pipeQuantity": 50, "orderId": "O1"}],
        "items": {"I1": {"productCode": "P1", "extrusionGroup": 1, "headPin": "H1", "extruderFord": True, "extruderNew": False}},
        "extruders": [{"code": "FORD", "isActive": True}, {"code": "NEW", "isActive": True}],
        "workdays": WORKDAYS,
        "shiftCapacity": 100,
        "efficiency": 0.75,
    }
    inp.update(over)
    return inp


def test_정상_배치_본수():
    r = schedule_extrusion(base())
    assert r["status"] in ("OPTIMAL", "FEASIBLE")
    assert sum(a["quantity"] for a in r["assignments"]) == 50
    assert r["warnings"] == []


def test_압출기_호환만_배치():
    # extruderFord=True, extruderNew=False → NEW에는 배치 0건
    r = schedule_extrusion(base())
    assert r["assignments"]
    assert all(a["extruderCode"] == "FORD" for a in r["assignments"])


def test_D1_마감_준수():
    # deadline 5/21(idx3) → 5/22 배치 금지
    r = schedule_extrusion(base())
    assert all(a["date"] <= "2026-05-21" for a in r["assignments"])


def test_용량초과_부분배치_warning():
    r = schedule_extrusion(base(pipeRequests=[{"itemId": "I1", "productCode": "P1", "extrusionDeadline": "2026-05-18", "pipeQuantity": 10000, "orderId": "O1"}]))
    assert any("부분" in w for w in r["warnings"])


def test_다이노즐_최소화_단일압출기():
    # 둘 다 호환이면 그룹이 한 압출기에 모임(사용 압출기 수 1)
    r = schedule_extrusion(base(items={"I1": {"productCode": "P1", "extrusionGroup": 1, "headPin": "H1", "extruderFord": True, "extruderNew": True}}))
    used = {a["extruderCode"] for a in r["assignments"]}
    assert len(used) == 1  # 다이/노즐 변경 최소화 → 단일 압출기


def test_품번없음_warning():
    r = schedule_extrusion(base(items={}))
    assert r["assignments"] == []
    assert any("마스터 없음" in w for w in r["warnings"])
