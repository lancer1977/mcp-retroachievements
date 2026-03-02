# RetroAchievements MCP Server (C#)

C# replacement for the TypeScript `mcp-retroachievements` server.

## What it does

- Uses the official `ModelContextProtocol` C# package for stdio MCP hosting.
- Reuses `Api.RetroAchievements` for strongly-typed endpoint access.
- Keeps `ra_search_games` via a raw endpoint adapter (`API_GetGameList.php`) because the current C# wrapper does not expose it.

## Tools exposed

- `SearchGames(query)`
- `GetGame(gameId)`
- `GetGameExtended(gameId, officialOnly=true)`
- `GetUserRecentlyPlayed(userName, count=10)`
- `GetUserProgress(userName, gameId, includeMetadata=true)`
- `GetConsoleIds()`
- `GetAchievementUnlocks(achievementId, count=50, offset=0)`
- `GetUserProfile(userName)`

## Environment variables

- `RA_USERNAME` (required)
- `RA_API_KEY` (required)
- `RA_BASE_URL` (optional, defaults to `https://retroachievements.org/API`)

## Build & run

```bash
cd csharp
dotnet build RetroAchievements.McpServer.slnx
RA_USERNAME=... RA_API_KEY=... dotnet run --project src/RetroAchievements.McpServer
```

## MCP client config example

```json
{
  "mcpServers": {
    "retroachievements": {
      "command": "dotnet",
      "args": [
        "run",
        "--project",
        "/home/lancer1977/code/mcp-retroachievements/csharp/src/RetroAchievements.McpServer"
      ],
      "env": {
        "RA_USERNAME": "your_username",
        "RA_API_KEY": "your_api_key"
      }
    }
  }
}
```
