---
name: retroachievements
description: Query RetroAchievements API for games, achievements, and user progress. Use when searching RA games by title, getting game metadata, fetching user progress, viewing recently played games, or syncing cached data. Requires RA_USERNAME and RA_API_KEY environment variables.
---

# RetroAchievements Skill

This skill wraps the RetroAchievements MCP server.

## Requirements

Set environment variables:
- `RA_USERNAME` - your RetroAchievements username
- `RA_API_KEY` - your RA API key (get from https://retroachievements.org/Controls)

Or create a `.env` file in `~/code/mcp-retroachievements/` with:
```
RA_USERNAME=your_username
RA_API_KEY=your_api_key
```

## Usage

The MCP server must be running. Start it with:
```bash
cd ~/code/mcp-retroachievements && npm start
```

Use `mcporter call retroachievements.<tool>` or directly via the MCP:

### Search Games
```
mcporter call retroachievements.ra_search_games query="zelda"
```

### Get Game Metadata
```
mcporter call retroachievements.ra_get_game gameId=14402
```

### Get Game Achievements
```
mcporter call retroachievements.ra_get_game_achievements gameId=14402
```

### User Recently Played
```
mcporter call retroachievements.ra_get_user_recently_played username="YourUser" count=5
```

### User Progress (game)
```
mcporter call retroachievements.ra_get_user_progress username="YourUser" gameId=14402
```

### Force Refresh Game Cache
```
mcporter call retroachievements.ra_sync_game gameId=14402
```

### Force Refresh User Cache
```
mcporter call retroachievements.ra_sync_user username="YourUser" gameId=14402
```

## Output Format

- Games: title, ID, console, achievement count
- Achievements: title, description, points, icon
- User progress: completion %, unlocked/total achievements
- Summarize in Markdown, include key stats
