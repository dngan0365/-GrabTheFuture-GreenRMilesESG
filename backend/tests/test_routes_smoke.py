"""Smoke test: import the FastAPI app and exercise the three ML endpoints.

Run from backend/:
    python tests/test_routes_smoke.py
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)


def test_prediction_monthly():
    r = client.post(
        "/api/v1/prediction/monthly",
        json={"companyId": "cmp_001", "from": "2026-06-01", "to": "2026-06-30"},
    )
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    assert data["companyId"] == "cmp_001"
    assert data["model"]["modelType"] in ("LINEAR_REGRESSION", "MEAN_FALLBACK")
    assert data["prediction"]["predictedEmissionKg"] >= 0
    assert data["status"]["riskLevel"] in ("AT_RISK", "ON_TRACK")
    assert 0.5 <= data["prediction"]["confidence"] <= 0.95
    print(f"[monthly] pred={data['prediction']['predictedEmissionKg']} "
          f"risk={data['status']['riskLevel']} conf={data['prediction']['confidence']}")


def test_prediction_employee():
    r = client.get(
        "/api/v1/prediction/employee",
        params={"from": "2026-06-22", "to": "2026-06-28", "userId": "usr_001"},
    )
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    assert data["userId"] == "usr_001"
    assert data["nextWeek"]["from"] == "2026-06-29"
    assert data["nextWeek"]["to"] == "2026-07-05"
    assert data["prediction"]["predictedEmissionKg"] >= 0
    print(f"[employee] currentWeek={data['currentWeek']['totalTrips']} trips, "
          f"pred={data['prediction']['predictedEmissionKg']} conf={data['prediction']['confidence']}")


def test_recommendation_employee_en():
    r = client.post(
        "/api/v1/recommendation",
        json={"scope": "employee", "from": "2026-06-01", "to": "2026-06-30", "language": "en"},
    )
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    assert data["scope"] == "employee"
    assert 1 <= len(data["recommendations"]) <= 3
    assert data["model"]["provider"] == "MOCK"
    assert data["nextBestAction"]
    print(f"[rec-en] recs={len(data['recommendations'])} summary='{data['summary'][:40]}...'")


def test_recommendation_company_vi():
    r = client.post(
        "/api/v1/recommendation",
        json={"scope": "company", "from": "2026-06-01", "to": "2026-06-30", "language": "vi"},
    )
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    assert data["scope"] == "company"
    assert data["recommendations"]
    print(f"[rec-vi] summary='{data['summary'][:40]}...'")


def test_openapi_lists_routes():
    paths = client.get("/openapi.json").json()["paths"]
    for p in ("/api/v1/prediction/monthly", "/api/v1/prediction/employee", "/api/v1/recommendation"):
        assert p in paths, f"missing {p}"
    print(f"[openapi] {len([p for p in paths if p.startswith('/api/v1')])} /api/v1 routes registered")


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"PASS {t.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL {t.__name__}: {e}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    sys.exit(1 if failed else 0)
