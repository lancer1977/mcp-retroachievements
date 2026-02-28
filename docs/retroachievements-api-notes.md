# RetroAchievements API Notes

## Authentication model

RetroAchievements API requests use query-string credentials:

- `z` = RetroAchievements username
- `y` = RetroAchievements web API key

## Endpoints wired in this project

Base URL (default): `https://retroachievements.org/API`

- `API_GetGameList.php?g={query}`
- `API_GetGame.php?i={gameId}`
- `API_GetGameExtended.php?i={gameId}`
- `API_GetUserRecentlyPlayedGames.php?u={username}&c={count}`
- `API_GetGameInfoAndUserProgress.php?u={username}&g={gameId}`

## Validation caveat

Direct docs scraping from this environment currently returns HTTP 403 for `/API/` pages. Endpoint set above is based on established RA Web API naming conventions used by existing integrations and this repo's own `.NET` service naming (`GetGameInfoAndUserProgress`, etc.).

If RA changes endpoint names/params, update `src/raClient.ts`.
