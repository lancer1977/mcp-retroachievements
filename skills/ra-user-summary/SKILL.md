---
name: ra-user-summary
description: Generate RetroAchievements user summaries (recent achievements, rank, and score) from a username + API key. Use when a user asks for a quick RA profile digest, latest unlocks, stream-ready recap, or periodic polling of achievement progress.
---

# RA User Summary

Use this skill to fetch a concise RetroAchievements snapshot for a user.

## Inputs
- `RA_USERNAME` (account that owns the API key)
- `RA_API_KEY`
- target username to summarize

## Workflow
1. Ensure env vars are set:
   - `RA_USERNAME`
   - `RA_API_KEY`
2. Run:
   - `python3 skills/ra-user-summary/scripts/ra_user_summary.py --user <target_username>`
3. Return a concise summary:
   - rank/score block
   - latest achievements block
   - one-line status insight

## Output format
- **User:** name
- **Score:** total points + rank (if available)
- **Recent Unlocks:** last 5 achievements with game/title/time
- **Quick Insight:** 1-2 lines (pace/trend/highlight)

## Notes
- If RA returns partial data, still provide a best-effort summary.
- Never print raw API key.
- If API errors/rate limits occur, report cause and suggest retry window.
