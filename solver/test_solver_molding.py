"""성형 CP-SAT 솔버 단위 테스트 (T12.2.3) — 룰 스케줄러 불변식 검증."""
from __future__ import annotations

from solver_molding import schedule_molding

WORKDAYS = ["2026-05-18", "2026-05-19", "2026-05-20", "2026-05-21", "2026-05-22"]


def base_input(**over) -> dict:
    inp = {
        "orders": [{"itemId": "I1", "deliveryDate": "2026-05-22", "quantity": 10, "orderId": "O1"}],
        "items": {"I1": {"productCode": "P1", "moldsPerAngle": 5, "equipmentType": "MOLDING_LP", "allowedSlots": ["A"]}},
        "equipment": [{"code": "LP1", "type": "MOLDING_LP", "slots": ["A", "B"], "isActive": True}],
        "workdays": WORKDAYS,
        "rotationsPerDay": 10,
        "rotationsPerNight": 10,
        "d2Days": 2,
    }
    inp.update(over)
    return inp


def test_정상_배치_회전수():
    r = schedule_molding(base_input())
    assert r["engine"] == "solver"
    assert r["status"] in ("OPTIMAL", "FEASIBLE")
    # ceil(10/5)=2 회전 전량 배치
    assert sum(a["rotations"] for a in r["assignments"]) == 2
    assert r["warnings"] == []


def test_슬롯X_배치_0건():
    # allowedSlots=['A']인데 장비 슬롯은 A,B → B에는 절대 배치 안 됨
    r = schedule_molding(base_input())
    assert r["assignments"]
    assert all(a["slot"] == "A" for a in r["assignments"])


def test_D2_마감_준수():
    # 납품 5/22(idx4) - d2=2 → deadline idx2(5/20). 5/21·5/22 배치 금지
    r = schedule_molding(base_input())
    assert all(a["date"] <= "2026-05-20" for a in r["assignments"])


def test_용량초과_부분배치_warning():
    # quantity 1000 → 200회전 필요 ≫ 가용 용량 → 부분 배치 + 경고
    r = schedule_molding(base_input(orders=[{"itemId": "I1", "deliveryDate": "2026-05-22", "quantity": 1000, "orderId": "O1"}]))
    assert any("부분" in w for w in r["warnings"])


def test_슬롯없는_품번_경고_무배치():
    r = schedule_molding(base_input(items={"I1": {"productCode": "P1", "moldsPerAngle": 5, "equipmentType": "MOLDING_LP", "allowedSlots": []}}))
    assert r["assignments"] == []
    assert any("배치 불가" in w for w in r["warnings"])


def test_품번마스터_없음_경고():
    r = schedule_molding(base_input(items={}))
    assert r["assignments"] == []
    assert any("마스터 없음" in w for w in r["warnings"])
