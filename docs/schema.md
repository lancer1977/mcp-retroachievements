# SQLite Schema (v0.1)

## Tables

- `api_cache`
  - key-value cache for raw endpoint payloads
  - fields: `cache_key`, `payload_json`, `fetched_at_utc`, `expires_at_utc`
- `games`
  - normalized game row + raw payload
- `achievements`
  - normalized achievement row + raw payload
- `users`
  - reserved for profile snapshots
- `user_game_progress`
  - per-user, per-game progress payload
- `user_achievement_unlocks`
  - reserved for unlocked achievement snapshots

## Cache policy

- Games / achievements: long TTL (default 12h)
- User progress: short TTL (default 10m)
- User recent activity: short TTL (default 5m)
- Force-refresh is supported by sync tools
