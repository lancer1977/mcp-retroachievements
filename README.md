# RetroAchievements MCP (Obsidian Vault Project)

MCP server for querying RetroAchievements.

> C# replacement server lives in `./csharp` and is now the preferred implementation.
> The TypeScript implementation in `./src` is kept temporarily for migration compatibility.

## Features (MVP)

- `ra_search_games`
- `ra_get_game`
- `ra_get_game_achievements`
- `ra_get_user_recently_played`
- `ra_get_user_progress`
- `ra_sync_game`
- `ra_sync_user`

## Setup

1. Install deps
   - `npm install`
2. Create env
   - `cp .env.example .env`
   - fill `RA_USERNAME` and `RA_API_KEY`
3. Build
   - `npm run build`
4. Run (stdio MCP)
   - `npm start`

## Configure in Cline MCP settings

Add to `/home/lancer1977/.cline/data/settings/cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "retroachievements": {
      "command": "node",
      "args": [
        "/home/lancer1977/vaults/work/30_Creation/Projects/RetroAchievements MCP/dist/index.js"
      ],
      "env": {
        "RA_USERNAME": "your_username",
        "RA_API_KEY": "your_api_key",
        "RA_BASE_URL": "https://retroachievements.org/API",
        "CACHE_DB_PATH": "/home/lancer1977/vaults/work/30_Creation/Projects/RetroAchievements MCP/data/retroachievements.sqlite"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Notes

- SQLite cache file defaults to `data/retroachievements.sqlite`.
- `ra_sync_*` tools force refresh from remote API and update cache.
- Endpoint assumptions and validation notes are in `docs/retroachievements-api-notes.md`.
