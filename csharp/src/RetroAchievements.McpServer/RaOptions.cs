namespace RetroAchievements.McpServer;

public sealed record RaOptions(
    string Username,
    string ApiKey)
{
    public static RaOptions FromEnvironment()
    {
        var username = Environment.GetEnvironmentVariable("RA_USERNAME");
        var apiKey = Environment.GetEnvironmentVariable("RA_API_KEY");

        if (string.IsNullOrWhiteSpace(username))
            throw new InvalidOperationException("RA_USERNAME is required.");

        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("RA_API_KEY is required.");

        return new RaOptions(username, apiKey);
    }
}
