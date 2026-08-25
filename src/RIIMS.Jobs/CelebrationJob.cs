using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RIIMS.Application.Interfaces;

namespace RIIMS.Jobs;

public class CelebrationJob : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<CelebrationJob> _logger;

    public CelebrationJob(IServiceProvider serviceProvider, ILogger<CelebrationJob> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("CelebrationJob background service starting...");

        // Initial delay to allow DB migrations and data seeding on startup
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var celebrationService = scope.ServiceProvider.GetRequiredService<ICelebrationNotificationService>();

                _logger.LogInformation("Running daily celebration check...");
                var result = await celebrationService.ProcessDailyCelebrationsAsync();
                _logger.LogInformation("Celebration check completed: {Message}", result.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred during daily celebration background job execution.");
            }

            // Check every 1 hour (CelebrationLogs guarantees idempotency once per date/event)
            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }
}
