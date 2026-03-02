#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import os
import sys
import urllib.parse
import urllib.request

BASE = os.getenv("RA_BASE_URL", "https://retroachievements.org/API").rstrip("/")


def api_get(endpoint: str, owner: str, api_key: str, params: dict):
    q = {"z": owner, "y": api_key, **params}
    url = f"{BASE}/{endpoint}?{urllib.parse.urlencode(q)}"
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=20) as resp:
        body = resp.read().decode("utf-8")
    return json.loads(body)


def parse_recent(payload):
    if payload is None:
        return []
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for k in ("RecentAchievements", "Achievements", "results", "Results"):
            if isinstance(payload.get(k), list):
                return payload[k]
    return []


def fmt_when(v):
    if not v:
        return "unknown"
    try:
        s = str(v).replace("Z", "+00:00")
        d = dt.datetime.fromisoformat(s)
        return d.strftime("%Y-%m-%d %H:%M UTC")
    except Exception:
        return str(v)


def main():
    p = argparse.ArgumentParser(description="Summarize RetroAchievements user status")
    p.add_argument("--user", required=True, help="RetroAchievements username to summarize")
    p.add_argument("--recent", type=int, default=5, help="How many recent unlocks to show")
    args = p.parse_args()

    owner = os.getenv("RA_USERNAME")
    key = os.getenv("RA_API_KEY")

    if not owner or not key:
        print("ERROR: RA_USERNAME and RA_API_KEY environment vars are required.", file=sys.stderr)
        sys.exit(2)

    try:
        summary = api_get("API_GetUserSummary.php", owner, key, {"u": args.user})
    except Exception as e:
        print(f"ERROR: failed user summary call: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        recent_raw = api_get("API_GetUserRecentAchievements.php", owner, key, {"u": args.user, "m": 1440})
        recent = parse_recent(recent_raw)
    except Exception:
        recent = []

    user = summary.get("User") or summary.get("Username") or args.user
    rank = summary.get("Rank") or summary.get("UserRank") or "n/a"
    points = summary.get("TotalPoints") or summary.get("Points") or summary.get("TotalScore") or "n/a"

    print(f"User: {user}")
    print(f"Score: {points}")
    print(f"Rank: {rank}")
    print("Recent Unlocks:")

    shown = 0
    for a in recent:
        if shown >= args.recent:
            break
        title = a.get("Title") or a.get("AchievementTitle") or "Unknown achievement"
        game = a.get("GameTitle") or a.get("Game") or "Unknown game"
        when = fmt_when(a.get("DateAwarded") or a.get("Date") or a.get("DateUnlocked"))
        print(f"- {title} | {game} | {when}")
        shown += 1

    if shown == 0:
        print("- no recent achievements found in current window")

    print("Quick Insight:")
    if shown >= 3:
        print("- Active unlock pace in the last day; user appears recently engaged.")
    elif shown > 0:
        print("- Some recent progress; unlock cadence is light but non-zero.")
    else:
        print("- No recent unlocks found; may be inactive or outside the default time window.")


if __name__ == "__main__":
    main()
