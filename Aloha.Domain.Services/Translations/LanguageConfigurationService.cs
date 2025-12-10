using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Aloha.Infrastructure;
using Aloha.Domain.Customization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Aloha.Domain.Services.Translations
{
    public class LanguageConfigurationService : ILanguageConfigurationService
    {
        private readonly IDbContextFactory<AlohaDb> _dbFactory;
        private readonly ILogger<LanguageConfigurationService> _logger;

        public LanguageConfigurationService(
            IDbContextFactory<AlohaDb> dbFactory,
            ILogger<LanguageConfigurationService> logger)
        {
            _dbFactory = dbFactory;
            _logger = logger;
        }

        public async Task<List<string>> GetEnabledLanguagesAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
                
                // Get language configuration from CustomStyleSheets table
                // Query raw data to avoid enum parsing issues when database has enum values that don't exist in code
                // This prevents InvalidCastException when EF Core tries to materialize entities with invalid enum values
                var useCaseValue = "BootstrapCompleteOverride";
                
                // Use raw SQL query to get FileContent directly without materializing the entity
                // This avoids the enum conversion issue entirely
                var rawResults = await db.Database
                    .SqlQueryRaw<RawCustomStyleSheetResult>($"SELECT FileContent FROM CustomStyleSheets WHERE UseCase = {{0}}", useCaseValue)
                    .ToListAsync(cancellationToken);
                
                // Find the one with LanguageConfiguration in content
                var languageConfig = rawResults
                    .Where(r => r.FileContent != null && r.FileContent.Length > 0)
                    .Select(r =>
                    {
                        try
                        {
                            var json = System.Text.Encoding.UTF8.GetString(r.FileContent);
                            if (json.Contains("LanguageConfiguration"))
                            {
                                return System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json);
                            }
                        }
                        catch { }
                        return null;
                    })
                    .FirstOrDefault(d => d != null && d.ContainsKey("LanguageConfiguration"));
                
                if (languageConfig != null && languageConfig.TryGetValue("LanguageConfiguration", out var langConfigObj))
                {
                    var langConfigJson = langConfigObj.ToString();
                    if (!string.IsNullOrWhiteSpace(langConfigJson))
                    {
                        var langConfig = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(langConfigJson);
                        if (langConfig != null && langConfig.TryGetValue("EnabledLanguages", out var enabledLangsObj))
                        {
                            var enabledLangsJson = enabledLangsObj.ToString();
                            if (!string.IsNullOrWhiteSpace(enabledLangsJson))
                            {
                                var enabledLanguages = System.Text.Json.JsonSerializer.Deserialize<List<string>>(enabledLangsJson);
                                if (enabledLanguages != null && enabledLanguages.Any())
                                {
                                    return enabledLanguages;
                                }
                            }
                        }
                    }
                }
                
                // Default to en-US and es-CR if not configured
                return new List<string> { "en-US", "es-CR" };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error getting enabled languages. Defaulting to en-US and es-CR");
                return new List<string> { "en-US", "es-CR" };
            }
        }

        public async Task<string> GetPrimaryLanguageAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
                
                // Get language configuration from CustomStyleSheets table
                // Query raw data to avoid enum parsing issues when database has enum values that don't exist in code
                // This prevents InvalidCastException when EF Core tries to materialize entities with invalid enum values
                var useCaseValue = "BootstrapCompleteOverride";
                
                // Use raw SQL query to get FileContent directly without materializing the entity
                // This avoids the enum conversion issue entirely
                var rawResults = await db.Database
                    .SqlQueryRaw<RawCustomStyleSheetResult>($"SELECT FileContent FROM CustomStyleSheets WHERE UseCase = {{0}}", useCaseValue)
                    .ToListAsync(cancellationToken);
                
                // Find the one with LanguageConfiguration in content
                var languageConfig = rawResults
                    .Where(r => r.FileContent != null && r.FileContent.Length > 0)
                    .Select(r =>
                    {
                        try
                        {
                            var json = System.Text.Encoding.UTF8.GetString(r.FileContent);
                            if (json.Contains("LanguageConfiguration"))
                            {
                                return System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json);
                            }
                        }
                        catch { }
                        return null;
                    })
                    .FirstOrDefault(d => d != null && d.ContainsKey("LanguageConfiguration"));
                
                if (languageConfig != null && languageConfig.TryGetValue("LanguageConfiguration", out var langConfigObj))
                {
                    var langConfigJson = langConfigObj.ToString();
                    if (!string.IsNullOrWhiteSpace(langConfigJson))
                    {
                        var langConfig = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(langConfigJson);
                        if (langConfig != null && langConfig.TryGetValue("PrimaryLanguage", out var primaryLangObj))
                        {
                            var primaryLanguage = primaryLangObj?.ToString();
                            if (!string.IsNullOrWhiteSpace(primaryLanguage))
                            {
                                // Validate that primary language is in enabled languages
                                var enabledLanguages = await GetEnabledLanguagesAsync(cancellationToken);
                                if (enabledLanguages.Contains(primaryLanguage))
                                {
                                    return primaryLanguage;
                                }
                                else
                                {
                                    _logger.LogWarning("Primary language {PrimaryLanguage} is not in enabled languages. Using first enabled language.", primaryLanguage);
                                    return enabledLanguages.FirstOrDefault() ?? "en-US";
                                }
                            }
                        }
                    }
                }
                
                // Default to en-US if not configured
                return "en-US";
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error getting primary language. Defaulting to en-US");
                return "en-US";
            }
        }

        public async Task<bool> IsMultiLanguageEnabledAsync(CancellationToken cancellationToken = default)
        {
            var enabledLanguages = await GetEnabledLanguagesAsync(cancellationToken);
            return enabledLanguages.Count > 1;
        }

        public async Task<bool> IsLanguageEnabledAsync(string languageCode, CancellationToken cancellationToken = default)
        {
            var enabledLanguages = await GetEnabledLanguagesAsync(cancellationToken);
            return enabledLanguages.Contains(languageCode);
        }
        
        public async Task<string> GetLanguageDisplayNameAsync(string languageCode, CancellationToken cancellationToken = default)
        {
            var primaryLanguage = await GetPrimaryLanguageAsync(cancellationToken);
            
            // Language names in English
            var englishNames = new Dictionary<string, string>
            {
                { "en-US", "English" },
                { "en-GB", "English (UK)" },
                { "es-CR", "Spanish" },
                { "es", "Spanish" }
            };
            
            // Language names in Spanish
            var spanishNames = new Dictionary<string, string>
            {
                { "en-US", "Inglés" },
                { "en-GB", "Inglés (Reino Unido)" },
                { "es-CR", "Español" },
                { "es", "Español" }
            };
            
            // Return name in primary language
            if (primaryLanguage.StartsWith("es"))
            {
                return spanishNames.TryGetValue(languageCode, out var name) ? name : languageCode;
            }
            else
            {
                return englishNames.TryGetValue(languageCode, out var name) ? name : languageCode;
            }
        }
        
        // Helper class for raw SQL query results (avoids enum conversion issues)
        private class RawCustomStyleSheetResult
        {
            public byte[] FileContent { get; set; } = Array.Empty<byte>();
        }
    }
}

 