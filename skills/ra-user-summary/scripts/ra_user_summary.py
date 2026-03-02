#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import os
import sys
import urllib.parse
import urllib.request
from typing import Any, Dict, List

BASE = os.getenv("RA_BASE_URL", "https://retroachievements.org/API").rstrip("/")


def api_get(endpoint: str, owner: str, api_key: str, params: Dict[str, Any]):
    q = {"z": owner, "y": api_key, **params}
    url = f"{BASE}/{endpoint}?{urllib.parse.urlencode(q)}"
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=25) as resp:
        body = resp.read().decode("utf-8")
    return json.loads(body)


def parse_list(payload, keys=("Results", "results", "Items", "items", "Entries", "entries")):
    if payload is None:
        return []
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for k in keys:
            if isinstance(payload.get(k), list):
                return payload[k]
    return []


def parse_recent(payload):
    return parse_list(payload, keys=("RecentAchievements", "Achievements", "Results", "results"))


def fmt_when(v):
    if not v:
        return "unknown"
    try:
        s = str(v).replace("Z", "+00:00")
        d = dt.datetime.fromisoformat(s)
        return d.strftime("%Y-%m-%d %H:%M UTC")
    except Exception:
        return str(v)


def user_summary(owner: str, key: str, user: str, recent_n: int):
    summary = api_get("API_GetUserSummary.php", owner, key, {"u": user})
    try:
        recent_raw = api_get("API_GetUserRecentAchievements.php", owner, key, {"u": user, "m": 1440})
        recent = parse_recent(recent_raw)
    except Exception:
        recent = []

    u = summary.get("User") or summary.get("Username") or user
    rank = summary.get("Rank") or summary.get("UserRank") or "n/a"
    points = summary.get("TotalPoints") or summary.get("Points") or summary.get("TotalScore") or "n/a"

    print(f"User: {u}")
    print(f"Score: {points}")
    print(f"Rank: {rank}")
    print("Recent Unlocks:")

    shown = 0
    for a in recent:
        if shown >= recent_n:
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


def leaderboard(owner: str, key: str, top: int):
    # RA supports API_GetTopTenUsers; we call and trim/print best-effort.
    data = api_get("API_GetTopTenUsers.php", owner, key, {})
    rows = parse_list(data, keys=("TopTen", "Users", "Results", "results"))
    if not rows and isinstance(data, dict):
        rows = list(data.values()) if all(isinstance(v, dict) for v in data.values()) else []

    print("Leaderboard (Top Hardcore Points):")
    if not rows:
        print("- no leaderboard rows returned")
        return

    for i, row in enumerate(rows[:top], start=1):
        name = row.get("User") or row.get("Username") or row.get("Name") or "unknown"
        points = row.get("TotalPoints") or row.get("Points") or row.get("HardcorePoints") or row.get("Score") or "n/a"
        rank = row.get("Rank") or i
        print(f"{rank}. {name} — {points}")


def recommendations(owner: str, key: str, user: str, limit: int):
    recent_games = api_get("API_GetUserRecentlyPlayedGames.php", owner, key, {"u": user, "c": limit})
    games = parse_list(recent_games, keys=("Results", "results", "RecentGames", "Games"))
    if not games and isinstance(recent_games, list):
        games = recent_games

    candidates = []
    for g in games[:limit]:
        gid = g.get("GameID") or g.get("ID") or g.get("gameId")
        title = g.get("Title") or g.get("GameTitle") or g.get("Name") or f"Game {gid}"
        if not gid:
            continue
        try:
            progress = api_get("API_GetGameInfoAndUserProgress.php", owner, key, {"u": user, "g": gid, "a": 1})
        except Exception:
            continue

        achievements = progress.get("Achievements") if isinstance(progress, dict) else None
        if not isinstance(achievements, dict):
            continue

        total_points = 0
        remaining_points = 0
        unlocked_count = 0
        total_count = 0

        for a in achievements.values():
            if not isinstance(a, dict):
                continue
            pts = int(a.get("Points") or 0)
            total_points += pts
            total_count += 1
            unlocked_hc = bool(a.get("DateEarnedHardcore"))
            if unlocked_hc:
                unlocked_count += 1
            else:
                remaining_points += pts

        if total_count == 0:
            continue

        completion = round((unlocked_count / total_count) * 100, 1)
        candidates.append({
            "title": title,
            "game_id": gid,
            "remaining_points": remaining_points,
            "total_points": total_points,
            "completion": completion,
        })

    candidates.sort(key=lambda x: (x["remaining_points"], -x["completion"]), reverse=True)

    print(f"Recommendations for {user} (high remaining hardcore points):")
    if not candidates:
        print("- no recommendation candidates found from recent games")
        return

    for c in candidates[:10]:
        print(
            f"- {c['title']} (#{c['game_id']}): "
            f"{c['remaining_points']} remaining / {c['total_points']} total pts, "
            f"{c['completion']}% complete"
        )


def main():
    p = argparse.ArgumentParser(description="RetroAchievements summary/leaderboard/recommendations")
    p.add_argument("--user", help="RetroAchievements username to summarize/recommend")
    p.add_argument("--recent", type=int, default=5, help="How many recent unlocks to show")
    p.add_argument("--leaderboard-top", type=int, default=0, help="If >0, print top N leaderboard")
    p.add_argument("--recommend", action="store_true", help="Print game recommendations from recent games")
    p.add_argument("--recommend-limit", type=int, default=12, help="How many recent games to inspect")
    args = p.parse_args()

    owner = os.getenv("RA_USERNAME")
    key = os.getenv("RA_API_KEY")
    if not owner or not key:
        print("ERROR: RA_USERNAME and RA_API_KEY environment vars are required.", file=sys.stderr)
        sys.exit(2)

    try:
        if args.user:
            user_summary(owner, key, args.user, args.recent)
            print()

        if args.leaderboard_top and args.leaderboard_top > 0:
            leaderboard(owner, key, args.leaderboard_top)
            print()

        if args.recommend:
            if not args.user:
                print("ERROR: --recommend requires --user", file=sys.stderr)
                sys.exit(2)
            recommendations(owner, key, args.user, args.recommend_limit)

        if not args.user and not args.leaderboard_top and not args.recommend:
            print("Nothing to do. Use --user and/or --leaderboard-top and/or --recommend.")
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
