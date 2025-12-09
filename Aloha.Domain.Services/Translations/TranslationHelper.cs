using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Globalization;
using System.Text.Json;
using System.Text;
using Aloha.Infrastructure;
using Aloha.Domain.Localization;
using Aloha.Domain.Customization;

namespace Aloha.Domain.Services.Translations
{
    public class TranslationHelper : ITranslationHelper
    {
        private readonly IDbContextFactory<AlohaDb> _dbFactory;
        private readonly ILogger<TranslationHelper> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        public TranslationHelper(
            IDbContextFactory<AlohaDb> dbFactory,
            ILogger<TranslationHelper> logger,
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory)
        {
            _dbFactory = dbFactory;
            _logger = logger;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<string?> TranslateAsync(string englishText, string targetLanguageCode, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(englishText))
            {
                return null;
            }

            // Load settings from database first, fall back to appsettings.json
            var settings = await LoadTranslationSettingsAsync(cancellationToken);

            if (settings == null)
            {
                _logger.LogWarning("Translation API not configured. Cannot translate text.");
                return null;
            }

            try
            {
                string? translatedText = null;
                Exception? primaryException = null;

                // Try primary provider first
                if (settings.PrimaryProvider.Equals("Azure", StringComparison.OrdinalIgnoreCase))
                {
                    if (!string.IsNullOrWhiteSpace(settings.Azure?.ApiKey))
                    {
                        try
                        {
                            translatedText = await TranslateWithAzureAsync(englishText, targetLanguageCode, 
                                settings.Azure.ApiKey, settings.Azure.Region, settings.Azure.Endpoint, cancellationToken);
                        }
                        catch (Exception ex)
                        {
                            primaryException = ex;
                            _logger.LogWarning(ex, "Primary provider (Azure) failed, trying fallback");
                        }
                    }
                }
                else if (settings.PrimaryProvider.Equals("Google", StringComparison.OrdinalIgnoreCase))
                {
                    if (!string.IsNullOrWhiteSpace(settings.Google?.ApiKey))
                    {
                        try
                        {
                            translatedText = await TranslateWithGoogleAsync(englishText, targetLanguageCode, 
                                settings.Google.ApiKey, cancellationToken);
                        }
                        catch (Exception ex)
                        {
                            primaryException = ex;
                            _logger.LogWarning(ex, "Primary provider (Google) failed, trying fallback");
                        }
                    }
                }

                // If primary failed, try fallback provider
                if (translatedText == null)
                {
                    var fallbackProvider = settings.PrimaryProvider.Equals("Azure", StringComparison.OrdinalIgnoreCase) ? "Google" : "Azure";
                    
                    if (fallbackProvider.Equals("Azure", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(settings.Azure?.ApiKey))
                    {
                        translatedText = await TranslateWithAzureAsync(englishText, targetLanguageCode, 
                            settings.Azure.ApiKey, settings.Azure.Region, settings.Azure.Endpoint, cancellationToken);
                    }
                    else if (fallbackProvider.Equals("Google", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(settings.Google?.ApiKey))
                    {
                        translatedText = await TranslateWithGoogleAsync(englishText, targetLanguageCode, 
                            settings.Google.ApiKey, cancellationToken);
                    }
                }

                if (translatedText == null && primaryException != null)
                {
                    throw primaryException;
                }

                return translatedText;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error translating text from English to {TargetLanguage}", targetLanguageCode);
                return null;
            }
        }

        public async Task<List<string>> GetAvailableLanguagesAsync(CancellationToken cancellationToken = default)
        {
            await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
            
            var languages = await db.Set<LocalizationCulture>()
                .Where(c => EF.Property<string>(c, "Culture") != "en-US" && EF.Property<string>(c, "Culture") != "en-GB")
                .Select(c => EF.Property<string>(c, "Culture"))
                .ToListAsync(cancellationToken);

            return languages;
        }

        public bool IsTranslationApiConfigured()
        {
            // Check database first, then appsettings.json
            var settings = LoadTranslationSettingsAsync().GetAwaiter().GetResult();
            if (settings != null)
            {
                var hasAzure = !string.IsNullOrWhiteSpace(settings.Azure?.ApiKey);
                var hasGoogle = !string.IsNullOrWhiteSpace(settings.Google?.ApiKey);
                return hasAzure || hasGoogle;
            }

            // Fall back to appsettings.json
            var translationProvider = _configuration["Translation:Provider"] ?? "Azure";
            
            if (translationProvider.Equals("Azure", StringComparison.OrdinalIgnoreCase))
            {
                var apiKey = _configuration["Translation:Azure:ApiKey"];
                return !string.IsNullOrWhiteSpace(apiKey);
            }
            else if (translationProvider.Equals("Google", StringComparison.OrdinalIgnoreCase))
            {
                var apiKey = _configuration["Translation:Google:ApiKey"];
                return !string.IsNullOrWhiteSpace(apiKey);
            }

            return false;
        }

        private async Task<TranslationSettingsDto?> LoadTranslationSettingsAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
                // Try to find translation settings in database by content (since TranslationSettings enum may not exist)
                // Load all and filter in memory since EF Core can't translate Encoding.UTF8.GetString to SQL
                var allStyleSheets = await db.CustomStyleSheets.ToListAsync(cancellationToken);
                var settingsFile = allStyleSheets.FirstOrDefault(f => 
                    f.FileContent != null && 
                    f.FileContent.Length > 0 &&
                    Encoding.UTF8.GetString(f.FileContent).Contains("\"PrimaryProvider\""));

                if (settingsFile?.FileContent is { Length: > 0 })
                {
                    var json = Encoding.UTF8.GetString(settingsFile.FileContent);
                    return JsonSerializer.Deserialize<TranslationSettingsDto>(json);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load translation settings from database, falling back to appsettings.json");
            }

            // Fall back to appsettings.json
            var provider = _configuration["Translation:Provider"] ?? "Azure";
            var azureKey = _configuration["Translation:Azure:ApiKey"];
            var googleKey = _configuration["Translation:Google:ApiKey"];

            if (string.IsNullOrWhiteSpace(azureKey) && string.IsNullOrWhiteSpace(googleKey))
            {
                return null;
            }

            return new TranslationSettingsDto
            {
                PrimaryProvider = provider,
                Azure = !string.IsNullOrWhiteSpace(azureKey) ? new AzureTranslationSettingsDto
                {
                    ApiKey = azureKey,
                    Region = _configuration["Translation:Azure:Region"] ?? "global",
                    Endpoint = _configuration["Translation:Azure:Endpoint"] ?? "https://api.cognitive.microsofttranslator.com"
                } : null,
                Google = !string.IsNullOrWhiteSpace(googleKey) ? new GoogleTranslationSettingsDto
                {
                    ApiKey = googleKey
                } : null
            };
        }

        private async Task<string?> TranslateWithAzureAsync(string text, string targetLanguageCode, string apiKey, string region, string endpoint, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("Azure Translator API key not configured.");
                return null;
            }

            // Convert language code (e.g., "es-CR" -> "es")
            var targetLang = targetLanguageCode.Split('-')[0];

            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", apiKey);
            client.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Region", region);

            var route = $"/translate?api-version=3.0&from=en&to={targetLang}";
            var requestBody = JsonSerializer.Serialize(new[] { new { Text = text } });
            var content = new StringContent(requestBody, System.Text.Encoding.UTF8, "application/json");

            var response = await client.PostAsync($"{endpoint}{route}", content, cancellationToken);
            response.EnsureSuccessStatusCode();

            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<AzureTranslationResponse[]>(responseBody);

            return result?[0]?.Translations?[0]?.Text;
        }

        private async Task<string?> TranslateWithGoogleAsync(string text, string targetLanguageCode, string apiKey, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("Google Translate API key not configured.");
                return null;
            }

            // Convert language code (e.g., "es-CR" -> "es")
            var targetLang = targetLanguageCode.Split('-')[0];

            var client = _httpClientFactory.CreateClient();
            var url = $"https://translation.googleapis.com/language/translate/v2?key={apiKey}&q={Uri.EscapeDataString(text)}&source=en&target={targetLang}";

            var response = await client.GetAsync(url, cancellationToken);
            response.EnsureSuccessStatusCode();

            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<GoogleTranslationResponse>(responseBody);

            return result?.Data?.Translations?[0]?.TranslatedText;
        }

        private class AzureTranslationResponse
        {
            public AzureTranslation[]? Translations { get; set; }
        }

        private class AzureTranslation
        {
            public string? Text { get; set; }
            public string? To { get; set; }
        }

        private class GoogleTranslationResponse
        {
            public GoogleTranslationData? Data { get; set; }
        }

        private class GoogleTranslationData
        {
            public GoogleTranslationItem[]? Translations { get; set; }
        }

        private class GoogleTranslationItem
        {
            public string? TranslatedText { get; set; }
        }

        private class TranslationSettingsDto
        {
            public string PrimaryProvider { get; set; } = "Azure";
            public AzureTranslationSettingsDto? Azure { get; set; }
            public GoogleTranslationSettingsDto? Google { get; set; }
        }

        private class AzureTranslationSettingsDto
        {
            public string ApiKey { get; set; } = "";
            public string Region { get; set; } = "global";
            public string Endpoint { get; set; } = "https://api.cognitive.microsofttranslator.com";
        }

        private class GoogleTranslationSettingsDto
        {
            public string ApiKey { get; set; } = "";
        }
    }
}

