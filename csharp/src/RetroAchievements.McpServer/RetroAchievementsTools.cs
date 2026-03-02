using System.ComponentModel;
using System.Text.Json;
using ModelContextProtocol.Server;

namespace RetroAchievements.McpServer;

[McpServerToolType]
public sealed class RetroAchievementsTools
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly RetroAchievementsApiFactory _factory;
    private readonly RetroAchievementsRawClient _rawClient;

    public RetroAchievementsTools(RetroAchievementsApiFactory factory, RetroAchievementsRawClient rawClient)
    {
        _factory = factory;
        _rawClient = rawClient;
    }

    [McpServerTool, Description("Search RetroAchievements games by title.")]
    public async Task<string> SearchGames([Description("Game title query")] string query)
    {
        var data = await _rawClient.SearchGames(query);
        return JsonSerializer.Serialize(data, JsonOptions);
    }

    [McpServerTool, Description("Get game metadata by game id.")]
    public async Task<string> GetGame([Description("RetroAchievements game id")] int gameId)
    {
        var data = await _factory.Games().GetGame(gameId);
        return JsonSerializer.Serialize(data, JsonOptions);
    }

    [McpServerTool, Description("Get extended game payload including achievements.")]
    public async Task<string> GetGameExtended([Description("RetroAchievements game id")] int gameId, [Description("Only official achievements")] bool officialOnly = true)
    {
        var data = await _factory.Games().GetGameExtended(gameId, officialOnly);
        return JsonSerializer.Serialize(data, JsonOptions);
    }

    [McpServerTool, Description("Get a user's recently played games.")]
    public async Task<string> GetUserRecentlyPlayed([Description("RetroAchievements username")] string userName, [Description("Number of games")] int count = 10)
    {
        var data = await _factory.Users().GetUserRecentlyPlayedGames(userName, count);
        return JsonSerializer.Serialize(data, JsonOptions);
    }

    [McpServerTool, Description("Get user progress for a specific game.")]
    public async Task<string> GetUserProgress([Description("RetroAchievements username")] string userName, [Description("Game id")] int gameId, [Description("Include metadata")] bool includeMetadata = true)
    {
        var data = await _factory.Users().GetGameInfoAndUserProgress(userName, gameId, includeMetadata);
        return JsonSerializer.Serialize(data, JsonOptions);
    }

    [McpServerTool, Description("Get available console ids and names.")]
    public async Task<string> GetConsoleIds()
    {
        var data = await _factory.Systems().GetConsoleIDs();
        return JsonSerializer.Serialize(data, JsonOptions);
    }

    [McpServerTool, Description("Get achievement unlocks for an achievement id.")]
    public async Task<string> GetAchievementUnlocks([Description("Achievement id")] int achievementId, [Description("Max rows")] int count = 50, [Description("Offset")] int offset = 0)
    {
        var data = await _factory.Achievements().GetAchievementUnlocks(achievementId, count, offset);
        return JsonSerializer.Serialize(data, JsonOptions);
    }

    [McpServerTool, Description("Get user profile summary.")]
    public async Task<string> GetUserProfile([Description("RetroAchievements username")] string userName)
    {
        var data = await _factory.Users().GetUserProfile(userName);
        return JsonSerializer.Serialize(data, JsonOptions);
    }
}
