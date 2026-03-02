using Microsoft.Extensions.Http;
using System.Text.Json;

namespace RetroAchievements.McpServer;

public sealed class RetroAchievementsRawClient
{
    private readonly HttpClient _httpClient;
    private readonly RaOptions _options;

    public RetroAchievementsRawClient(IHttpClientFactory httpClientFactory, RaOptions options)
    {
        _httpClient = httpClientFactory.CreateClient("ra");
        _options = options;
    }

    public Task<JsonElement> SearchGames(string query)
        => Get("API_GetGameList.php", new Dictionary<string, string> { ["g"] = query });

    private async Task<JsonElement> Get(string endpoint, IReadOnlyDictionary<string, string> parameters)
    {
        var baseUrl = Environment.GetEnvironmentVariable("RA_BASE_URL") ?? "https://retroachievements.org/API";
        var url = new Uri($"{baseUrl.TrimEnd('/')}/{endpoint}");
        var builder = new UriBuilder(url);

        var query = new List<string>
        {
            $"z={Uri.EscapeDataString(_options.Username)}",
            $"y={Uri.EscapeDataString(_options.ApiKey)}"
        };

        foreach (var (k, v) in parameters)
        {
            query.Add($"{Uri.EscapeDataString(k)}={Uri.EscapeDataString(v)}");
        }

        builder.Query = string.Join("&", query);

        using var response = await _httpClient.GetAsync(builder.Uri);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"RetroAchievements API request failed ({(int)response.StatusCode}): {body}");

        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.Clone();
    }
}
