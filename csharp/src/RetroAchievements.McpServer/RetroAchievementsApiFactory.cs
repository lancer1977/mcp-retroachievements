using Microsoft.Extensions.Http;
using PolyhydraGames.RetroAchievements;
using PolyhydraGames.RetroAchievements.Achievements;
using PolyhydraGames.RetroAchievements.Games;
using PolyhydraGames.RetroAchievements.Systems;
using PolyhydraGames.RetroAchievements.Users;

namespace RetroAchievements.McpServer;

public sealed class RetroAchievementsApiFactory
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly DefaultAuthConfig _auth;

    public RetroAchievementsApiFactory(IHttpClientFactory httpClientFactory, RaOptions options)
    {
        _httpClientFactory = httpClientFactory;
        _auth = new DefaultAuthConfig
        {
            UserName = options.Username,
            ApiKey = options.ApiKey,
        };
    }

    public IRetroAchievementGameApi Games() => new RetroAchievementCheevoApi(_auth, _httpClientFactory.CreateClient("ra"));
    public IRetroAchievementUserApi Users() => new RetroAchievementUserApi(_auth, _httpClientFactory.CreateClient("ra"));
    public IRetroAchievementSystemApi Systems() => new RetroAchievementSystemApi(_auth, _httpClientFactory.CreateClient("ra"));
    public IRetroAchievementAchievementApi Achievements() => new AchievementApi(_auth, _httpClientFactory.CreateClient("ra"));
}
