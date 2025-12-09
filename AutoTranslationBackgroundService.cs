using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Aloha.Domain.Services.Translations;

namespace Aloha.Customer.Web.HostedServices
{
    /// <summary>
    /// Background service that runs after application startup to automatically translate
    /// missing Spanish strings. Runs once per application start to catch any new strings
    /// that were added since the last run.
    /// </summary>
    public class AutoTranslationBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<AutoTranslationBackgroundService> _logger;
        private readonly IHostApplicationLifetime _lifetime;

        public AutoTranslationBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<AutoTranslationBackgroundService> logger,
            IHostApplicationLifetime lifetime)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _lifetime = lifetime;
            _logger.LogInformation("AutoTranslationBackgroundService: Constructor called - Service is being created");
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("═══════════════════════════════════════════════════════════════");
            _logger.LogInformation("AutoTranslationBackgroundService: ExecuteAsync called - Service is starting");
            _logger.LogInformation("═══════════════════════════════════════════════════════════════");
            _logger.LogInformation("AutoTranslationBackgroundService: Service started, waiting for application to start...");
            
            // Wait for the application to fully start
            if (!_lifetime.ApplicationStarted.IsCancellationRequested)
            {
                _logger.LogInformation("AutoTranslationBackgroundService: Waiting for ApplicationStarted event...");
                var tcs = new TaskCompletionSource();
                _lifetime.ApplicationStarted.Register(() => tcs.SetResult());
                await tcs.Task;
                _logger.LogInformation("AutoTranslationBackgroundService: ApplicationStarted event received");
            }
            else
            {
                _logger.LogInformation("AutoTranslationBackgroundService: Application already started");
            }

            // Wait a bit more to ensure DefaultLanguageImportService has finished
            _logger.LogInformation("AutoTranslationBackgroundService: Waiting 10 seconds for DefaultLanguageImportService to complete...");
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            _logger.LogInformation("AutoTranslationBackgroundService: Wait complete, starting translation service...");

            try
            {
                _logger.LogInformation("═══════════════════════════════════════════════════════════════");
                _logger.LogInformation("AutoTranslationBackgroundService: Starting automatic translation");
                _logger.LogInformation("═══════════════════════════════════════════════════════════════");

                using var scope = _serviceProvider.CreateScope();
                var translationService = scope.ServiceProvider.GetRequiredService<IAutoTranslationService>();

                var translatedCount = await translationService.FillMissingTranslationsAsync(stoppingToken);

                if (translatedCount > 0)
                {
                    _logger.LogInformation("Auto-translation completed. Translated {Count} missing strings.", translatedCount);
                }
                else
                {
                    _logger.LogInformation("Auto-translation completed. No missing translations found.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in AutoTranslationBackgroundService");
            }
        }
    }
}