#!/usr/bin/env python3
import argparse
import json
import sys
import time
from datetime import datetime, timezone

import requests
from hf_balance import BASE, browser_session


def fetch_usage(session):
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    res = session.get(
        BASE + "/api/settings/billing/usage-v2",
        params={"startDate": int(month_start.timestamp()), "endDate": int(now.timestamp())},
        headers={"Accept": "application/json"},
        timeout=20,
    )
    res.raise_for_status()
    inference = res.json()["usage"]["inferenceProviders"]
    return int(inference["numRequests"]), float(inference["usedNanoUsd"]) / 1_000_000_000


def emit(status, username, browser, count=None, spent=None, delta=None, detail=None):
    data = {"provider": "huggingface", "status": status, "username": username, "browser": browser}
    if count is not None:
        data["requests_month"] = count
        data["spent_usd_month"] = spent
        data["new_requests"] = delta
    if detail:
        data["detail"] = detail
    print(json.dumps(data, ensure_ascii=False), flush=True)


def main():
    parser = argparse.ArgumentParser(description="Monitor de atividade HF sem token")
    parser.add_argument("--browser", choices=["auto", "chrome", "chromium", "firefox", "brave", "edge"], default="auto")
    parser.add_argument("--interval", type=float, default=5.0)
    parser.add_argument("--active-for", type=float, default=5.0)
    args = parser.parse_args()
    if args.interval < 1 or args.active_for < 0:
        parser.error("--interval deve ser >= 1 e --active-for >= 0")

    browser, session, identity = browser_session(args.browser)
    username = identity.get("name")
    previous = None
    last_activity = None
    period = None
    last_status = None

    while True:
        now = datetime.now(timezone.utc)
        month = (now.year, now.month)
        try:
            count, spent = fetch_usage(session)
            if period != month or (previous is not None and count < previous):
                previous = None
                period = month
            delta = max(0, count - previous) if previous is not None else 0
            if delta > 0:
                last_activity = time.monotonic()
            previous = count
            status = "working" if last_activity is not None and time.monotonic() - last_activity < args.active_for else "idle"
            emit(status, username, browser, count, spent, delta)
            last_status = status
        except (requests.RequestException, ValueError, KeyError, TypeError) as exc:
            if last_status != "unknown":
                emit("unknown", username, browser, detail=f"{type(exc).__name__}: {exc}")
            last_status = "unknown"
        time.sleep(args.interval)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        sys.exit(1)
