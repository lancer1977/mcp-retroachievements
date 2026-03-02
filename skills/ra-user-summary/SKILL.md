---
name: ra-user-summary
description: Generate RetroAchievements user summaries, leaderboard snapshots, and recommendation candidates from a username + API key. Use when a user asks for latest unlocks, rank/score digests, top-holder lists, or games worth chasing for hardcore points.
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
2. Run one or more modes:
   - User summary:
     - `python3 skills/ra-user-summary/scripts/ra_user_summary.py --user <target_username>`
   - Leaderboard top N:
     - `python3 skills/ra-user-summary/scripts/ra_user_summary.py --leaderboard-top 10`
   - Recommendations (high remaining hardcore points from recent games):
     - `python3 skills/ra-user-summary/scripts/ra_user_summary.py --user <target_username> --recommend`
3. Return concise blocks based on mode:
   - summary: rank/score + recent unlocks + one-line insight
   - leaderboard: top holders list
   - recommendations: games with highest remaining points

## Output format
### Summary mode
- **User:** name
- **Score:** total points + rank (if available)
- **Recent Unlocks:** last 5 achievements with game/title/time
- **Quick Insight:** 1-2 lines (pace/trend/highlight)

### Leaderboard mode
- numbered top list with user + points

### Recommendation mode
- game title/id + remaining points + completion %

## Notes
- If RA returns partial data, still provide a best-effort summary.
- Never print raw API key.
- If API errors/rate limits occur, report cause and suggest retry window.
