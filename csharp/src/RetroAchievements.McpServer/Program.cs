using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ModelContextProtocol.Server;
using RetroAchievements.McpServer;

var builder = Host.CreateApplicationBuilder(args);

builder.Services
    .AddSingleton<RaOptions>(RaOptions.FromEnvironment())
    .AddHttpClient("ra")
    .Services
    .AddSingleton<RetroAchievementsApiFactory>()
    .AddSingleton<RetroAchievementsRawClient>()
    .AddSingleton<RetroAchievementsTools>();

builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithTools<RetroAchievementsTools>();

await builder.Build().RunAsync();
