using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Globalization;
using System.Text.Json;
using System.Text;
using Aloha.Infrastructure;
using Aloha.Domain.Localization;
using Aloha.Domain.Customization;
using System.Reflection;
using System.Collections.Concurrent;

namespace Aloha.Domain.Services.Translations
{
    public class TranslationHelper : ITranslationHelper
    {
        private readonly IDbContextFactory<AlohaDb> _dbFactory;
        private readonly ILogger<TranslationHelper> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILanguageConfigurationService _languageConfigService;
        
        // Cache: Culture -> ResourceKey -> Key -> Text
        private static readonly ConcurrentDictionary<string, Dictionary<string, Dictionary<string, string>>> _cache
            = new(StringComparer.OrdinalIgnoreCase);
        private static bool _cacheLoaded = false;
        private static readonly SemaphoreSlim _cacheLock = new(1, 1);

        public TranslationHelper(
            IDbContextFactory<AlohaDb> dbFactory,
            ILogger<TranslationHelper> logger,
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory,
            ILanguageConfigurationService languageConfigService)
        {
            _dbFactory = dbFactory;
            _logger = logger;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
            _languageConfigService = languageConfigService;
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

        public async Task<string> GetLocalTextAsync(object entity, string fieldName, string? culture = null, CancellationToken cancellationToken = default)
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            if (entity == null)
            {
                sw.Stop();
                _logger.LogDebug("GetLocalTextAsync (null entity): {Elapsed} ms", sw.Elapsed.TotalMilliseconds);
                return "";
            }

            // Get primary language and enabled languages
            var primaryLanguage = await _languageConfigService.GetPrimaryLanguageAsync(cancellationToken);
            var enabledLanguages = await _languageConfigService.GetEnabledLanguagesAsync(cancellationToken);
            
            // Normalize culture
            string currentCulture = primaryLanguage;
            if (!string.IsNullOrWhiteSpace(culture))
            {
                var cultureName = culture.Trim();
                // Map to enabled cultures
                if (enabledLanguages.Contains(cultureName))
                {
                    currentCulture = cultureName;
                }
                else if (cultureName.StartsWith("en") && enabledLanguages.Any(l => l.StartsWith("en")))
                {
                    currentCulture = enabledLanguages.First(l => l.StartsWith("en"));
                }
                else if (cultureName.StartsWith("es") && enabledLanguages.Any(l => l.StartsWith("es")))
                {
                    currentCulture = enabledLanguages.First(l => l.StartsWith("es"));
                }
                else
                {
                    // Default to primary language
                    currentCulture = primaryLanguage;
                }
            }

            // Get the entity type and ID to build the resource key
            var entityType = entity.GetType();
            
            // Check if this is an entity-specific translation that might be stored in the database
            // For entity-specific translations (like ProductApplicationType), always check the database
            // because the primary language value might be stored there, not in the entity property
            var isEntitySpecificTranslation = entityType.Name == "ProductApplicationType" && 
                (fieldName == "ApplicationDisplayName" || fieldName == "ApplicationDisplayDescription");
            
            // If current culture is primary language AND it's not an entity-specific translation,
            // AND the primary language is English (since entity properties are typically in English),
            // return the primary language value directly from the entity property
            // Otherwise, always check the database for translations
            if (currentCulture == primaryLanguage && !isEntitySpecificTranslation && primaryLanguage.StartsWith("en"))
            {
                sw.Stop();
                var result = GetPrimaryLanguageValue(entity, fieldName);
                _logger.LogDebug("GetLocalTextAsync (primary language, direct): {Elapsed} ms for {ResourceKey}.{FieldName} culture {Culture}", 
                    sw.Elapsed.TotalMilliseconds, $"{entityType.Name}.?", fieldName, currentCulture);
                return result;
            }
            var idProperty = entityType.GetProperty("Id");
            if (idProperty == null)
            {
                sw.Stop();
                var result = GetPrimaryLanguageValue(entity, fieldName);
                _logger.LogWarning("Entity type {EntityType} does not have an Id property. Returning primary language value: {Elapsed} ms", 
                    entityType.Name, sw.Elapsed.TotalMilliseconds);
                return result;
            }

            var id = idProperty.GetValue(entity);
            if (id == null)
            {
                sw.Stop();
                var result = GetPrimaryLanguageValue(entity, fieldName);
                _logger.LogDebug("GetLocalTextAsync (null id): {Elapsed} ms for {EntityType}.{FieldName} culture {Culture}", 
                    sw.Elapsed.TotalMilliseconds, entityType.Name, fieldName, currentCulture);
                return result;
            }

            // Build resource key based on entity type (e.g., "ProductApplicationType.{Id}")
            var resourceKey = $"{entityType.Name}.{id}";

            // Map property names to database keys
            // For ProductApplicationType, "ApplicationDisplayName" maps to "DisplayName" in DB
            var dbKey = fieldName;
            if (entityType.Name == "ProductApplicationType")
            {
                if (fieldName == "ApplicationDisplayName")
                {
                    dbKey = "DisplayName";
                }
                else if (fieldName == "ApplicationDisplayDescription")
                {
                    dbKey = "DisplayDescription";
                }
            }

            _logger.LogInformation("GetLocalTextAsync: EntityType={EntityType}, Id={Id}, FieldName={FieldName}, ResourceKey={ResourceKey}, DbKey={DbKey}, Culture={Culture}", 
                entityType.Name, id, fieldName, resourceKey, dbKey, currentCulture);

            // Warm the cache once (loads all cultures/strings at startup/first call)
            await EnsureCacheLoadedAsync(cancellationToken);

            // Try cached lookup
            if (_cache.TryGetValue(currentCulture, out var cultureDict))
            {
                if (cultureDict.TryGetValue(resourceKey, out var keyDict))
                {
                    if (keyDict.TryGetValue(dbKey, out var cachedValue))
                    {
                        sw.Stop();
                        if (string.IsNullOrWhiteSpace(cachedValue))
                        {
                            _logger.LogDebug("Translation found (cache hit, empty) for {ResourceKey}.{FieldName} in culture {Culture}: {Elapsed} ms. Returning primary language value.", 
                                resourceKey, fieldName, currentCulture, sw.Elapsed.TotalMilliseconds);
                        }
                        else
                        {
                            _logger.LogDebug("Translation (cache hit) for {ResourceKey}.{FieldName} in culture {Culture}: {Translation} - {Elapsed} ms", 
                                resourceKey, fieldName, currentCulture, cachedValue, sw.Elapsed.TotalMilliseconds);
                            return cachedValue;
                        }
                    }
                    else
                    {
                        sw.Stop();
                        _logger.LogWarning("No translation found (cache miss) for {ResourceKey}.{FieldName} in culture {Culture}: {Elapsed} ms. Returning primary language value.", 
                            resourceKey, fieldName, currentCulture, sw.Elapsed.TotalMilliseconds);
                    }
                }
                else
                {
                    sw.Stop();
                    _logger.LogWarning("No translations cached for ResourceKey {ResourceKey} in culture {Culture}: {Elapsed} ms. Returning primary language value.", 
                        resourceKey, currentCulture, sw.Elapsed.TotalMilliseconds);
                }
            }
            else
            {
                sw.Stop();
                _logger.LogWarning("No translations cached for culture {Culture}: {Elapsed} ms. Returning primary language value.", currentCulture, sw.Elapsed.TotalMilliseconds);
            }

            // Fall back to primary language value
            var fallback = GetPrimaryLanguageValue(entity, fieldName);
            _logger.LogDebug("GetLocalTextAsync fallback: {Elapsed} ms total for {ResourceKey}.{FieldName} culture {Culture}", sw.Elapsed.TotalMilliseconds, resourceKey, fieldName, currentCulture);
            return fallback;
        }

        private async Task EnsureCacheLoadedAsync(CancellationToken cancellationToken)
        {
            if (_cacheLoaded) return;

            await _cacheLock.WaitAsync(cancellationToken);
            try
            {
                if (_cacheLoaded) return;

                await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
                var allStrings = await db.Set<LocalizationString>()
                    .Include(s => s.LocalizationCulture)
                    .ToListAsync(cancellationToken);

                _cache.Clear();

                foreach (var str in allStrings)
                {
                    var culture = str.LocalizationCulture?.Culture;
                    if (string.IsNullOrWhiteSpace(culture))
                    {
                        continue;
                    }

                    var cultureDict = _cache.GetOrAdd(culture, _ => new Dictionary<string, Dictionary<string, string>>(StringComparer.OrdinalIgnoreCase));
                    if (!cultureDict.TryGetValue(str.ResourceKey, out var keyDict))
                    {
                        keyDict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                        cultureDict[str.ResourceKey] = keyDict;
                    }

                    keyDict[str.Key] = str.DefaultText ?? "";
                }

                _cacheLoaded = true;
                _logger.LogInformation("Translation cache warmed with {Count} entries across {Cultures} cultures", allStrings.Count, _cache.Count);
            }
            finally
            {
                _cacheLock.Release();
            }
        }

        private string GetPrimaryLanguageValue(object entity, string fieldName)
        {
            try
            {
                var entityType = entity.GetType();
                var property = entityType.GetProperty(fieldName);
                if (property != null)
                {
                    var value = property.GetValue(entity);
                    return value?.ToString() ?? "";
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error getting primary language value for field {FieldName} from entity type {EntityType}", 
                    fieldName, entity.GetType().Name);
            }
            return "";
        }

        /// <summary>
        /// Updates a specific translation entry in the cache. Call this after saving a translation to the database.
        /// </summary>
        /// <param name="culture">Culture code (e.g., "en-US", "es-CR")</param>
        /// <param name="resourceKey">Resource key (e.g., "Index", "ProductApplicationType.5")</param>
        /// <param name="key">Translation key (e.g., "page-heading", "DisplayName")</param>
        /// <param name="text">The translated text</param>
        public static void UpdateCacheEntry(string culture, string resourceKey, string key, string text)
        {
            if (string.IsNullOrWhiteSpace(culture) || string.IsNullOrWhiteSpace(resourceKey) || string.IsNullOrWhiteSpace(key))
            {
                return;
            }

            var cultureDict = _cache.GetOrAdd(culture, _ => new Dictionary<string, Dictionary<string, string>>(StringComparer.OrdinalIgnoreCase));
            
            if (!cultureDict.TryGetValue(resourceKey, out var keyDict))
            {
                keyDict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                cultureDict[resourceKey] = keyDict;
            }

            keyDict[key] = text ?? "";
        }

        /// <summary>
        /// Removes a specific translation entry from the cache. Call this after deleting a translation from the database.
        /// </summary>
        /// <param name="culture">Culture code</param>
        /// <param name="resourceKey">Resource key</param>
        /// <param name="key">Translation key</param>
        public static void InvalidateCacheEntry(string culture, string resourceKey, string key)
        {
            if (string.IsNullOrWhiteSpace(culture) || string.IsNullOrWhiteSpace(resourceKey) || string.IsNullOrWhiteSpace(key))
            {
                return;
            }

            if (_cache.TryGetValue(culture, out var cultureDict))
            {
                if (cultureDict.TryGetValue(resourceKey, out var keyDict))
                {
                    keyDict.Remove(key);
                }
            }
        }

        /// <summary>
        /// Reloads the entire cache from the database. Use this after bulk updates or when cache might be stale.
        /// </summary>
        public async Task RefreshCacheAsync(CancellationToken cancellationToken = default)
        {
            await _cacheLock.WaitAsync(cancellationToken);
            try
            {
                _cacheLoaded = false;
                _cache.Clear();
                await EnsureCacheLoadedAsync(cancellationToken);
                _logger.LogInformation("Translation cache refreshed");
            }
            finally
            {
                _cacheLock.Release();
            }
        }

        /// <summary>
        /// Updates multiple cache entries at once. More efficient than calling UpdateCacheEntry multiple times.
        /// </summary>
        /// <param name="updates">Dictionary of culture -> resourceKey -> key -> text</param>
        public static void UpdateCacheEntries(Dictionary<string, Dictionary<string, Dictionary<string, string>>> updates)
        {
            foreach (var cultureUpdate in updates)
            {
                var culture = cultureUpdate.Key;
                var cultureDict = _cache.GetOrAdd(culture, _ => new Dictionary<string, Dictionary<string, string>>(StringComparer.OrdinalIgnoreCase));

                foreach (var resourceUpdate in cultureUpdate.Value)
                {
                    var resourceKey = resourceUpdate.Key;
                    if (!cultureDict.TryGetValue(resourceKey, out var keyDict))
                    {
                        keyDict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                        cultureDict[resourceKey] = keyDict;
                    }

                    foreach (var keyUpdate in resourceUpdate.Value)
                    {
                        keyDict[keyUpdate.Key] = keyUpdate.Value ?? "";
                    }
                }
            }
        }
    }
}