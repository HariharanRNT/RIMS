using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RIIMS.Application.Interfaces;

namespace RIIMS.Jobs;

public class WorkdayEodCleanupJob : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<WorkdayEodCleanupJob> _logger;

    public WorkdayEodCleanupJob(IServiceProvider serviceProvider, ILogger<WorkdayEodCleanupJob> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("WorkdayEodCleanupJob background service starting...");

        // Short initial delay to allow startup data seeding to complete
        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var sessionService = scope.ServiceProvider.GetRequiredService<ISessionService>();
                
                await sessionService.PerformWorkdayEodCleanupAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred during Workday EOD session cleanup execution.");
            }

            // Run check every 1 minute for responsive same-day capping
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }
}
