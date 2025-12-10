using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using Aloha.Infrastructure;
using System.Text.Json.Serialization;
using System.Linq;
using Microsoft.Extensions.Configuration;
using Aloha.Domain.Localization;
using System.Text;
using System.Globalization;

namespace Aloha.Domain.Services.Translations
{
    /// <summary>
    /// Service that automatically translates missing Spanish (es-CR) strings from English (en-US) strings
    /// using Azure Translator API or Google Translate API.
    /// </summary>
    public interface IAutoTranslationService
    {
        Task<int> FillMissingTranslationsAsync(CancellationToken cancellationToken = default);
        Task<int> WipeSpanishTranslationsAsync(CancellationToken cancellationToken = default);
    }

    public class AutoTranslationService : IAutoTranslationService
    {
        private readonly IDbContextFactory<AlohaDb> _dbFactory;
        private readonly ILogger<AutoTranslationService> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        public AutoTranslationService(
            IDbContextFactory<AlohaDb> dbFactory,
            ILogger<AutoTranslationService> logger,
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory)
        {
            _dbFactory = dbFactory;
            _logger = logger;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<int> FillMissingTranslationsAsync(CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("AutoTranslationService: Starting FillMissingTranslationsAsync");
            try
            {
                // Get translations directory path
                var translationsDir = GetTranslationsDirectory();
                var jsonFilePath = Path.Combine(translationsDir, "es-CR_translations.json");
                var textFilePath = Path.Combine(translationsDir, "es-CR_translations.txt");
                
                // Load existing JSON translations (simple key-value format)
                var existingTranslations = await LoadExistingTranslationsAsync(jsonFilePath, cancellationToken);
                _logger.LogInformation("AutoTranslationService: Loaded {Count} existing translations from JSON", existingTranslations.Count);
                
                // Sync text file to JSON FIRST (before checking for new strings)
                if (File.Exists(textFilePath))
                {
                    var textFileInfo = new FileInfo(textFilePath);
                    var jsonFileInfo = File.Exists(jsonFilePath) ? new FileInfo(jsonFilePath) : null;
                    
                    if (jsonFileInfo == null || textFileInfo.LastWriteTime > jsonFileInfo.LastWriteTime)
                    {
                        _logger.LogInformation("AutoTranslationService: Text file is newer than JSON. Syncing text file to JSON...");
                        var textTranslations = ParseTextFile(textFilePath);
                        foreach (var kvp in textTranslations)
                        {
                            existingTranslations[kvp.Key] = kvp.Value;
                        }
                        await SaveTranslationsJsonAsync(jsonFilePath, existingTranslations, cancellationToken);
                        _logger.LogInformation("AutoTranslationService: Synced {Count} translations from text file to JSON", textTranslations.Count);
                    }
                }
                
                await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
                _logger.LogInformation("AutoTranslationService: Database context created");

                // Get culture IDs for en-US and es-CR
                _logger.LogInformation("AutoTranslationService: Looking for cultures en-US and es-CR");
                var englishCulture = await db.Set<LocalizationCulture>()
                    .FirstOrDefaultAsync(c => EF.Property<string>(c, "Culture") == "en-US", cancellationToken);
                var spanishCulture = await db.Set<LocalizationCulture>()
                    .FirstOrDefaultAsync(c => EF.Property<string>(c, "Culture") == "es-CR", cancellationToken);

                if (englishCulture == null)
                {
                    _logger.LogWarning("AutoTranslationService: English culture (en-US) not found in database.");
                    return 0;
                }
                _logger.LogInformation("AutoTranslationService: Found English culture (en-US) with ID: {Id}", englishCulture.Id);

                if (spanishCulture == null)
                {
                    _logger.LogInformation("AutoTranslationService: Spanish culture (es-CR) not found in database. Creating it...");
                    
                    // Create the es-CR culture
                    var esCrCultureInfo = CultureInfo.GetCultureInfo("es-CR");
                    spanishCulture = LocalizationCulture.Create(esCrCultureInfo, isDefault: false);
                    
                    db.Set<LocalizationCulture>().Add(spanishCulture);
                    await db.SaveChangesAsync(cancellationToken);
                    
                    _logger.LogInformation("AutoTranslationService: Created Spanish culture (es-CR) with ID: {Id}", spanishCulture.Id);
                }
                else
                {
                    _logger.LogInformation("AutoTranslationService: Found Spanish culture (es-CR) with ID: {Id}", spanishCulture.Id);
                }

                var localizationSet = db.Set<LocalizationString>();

                // Import any existing JSON/text translations into the database before we start diffing
                if (existingTranslations.Any())
                {
                    _logger.LogInformation(
                        "AutoTranslationService: Importing {Count} translations from JSON/text into database before processing...",
                        existingTranslations.Count);

                    await ImportJsonTranslationsToDatabaseAsync(db, spanishCulture, existingTranslations, null, cancellationToken);
                    await db.SaveChangesAsync(cancellationToken);
                }

                // Get all English (en-US) strings, EXCLUDING entity-specific translations (e.g., ProductApplicationType.*)
                // Entity-specific translations are managed separately and should not be processed by AutoTranslationService
                var englishQuery = Queryable.Where(localizationSet, s => s.LocalizationCultureId == englishCulture.Id
                    && !s.ResourceKey.StartsWith("ProductApplicationType."));
                var englishStrings = await englishQuery.ToListAsync(cancellationToken);

                if (!englishStrings.Any())
                {
                    _logger.LogInformation("No English strings found to translate.");
                    return 0;
                }

                // Get all existing Spanish (es-CR) strings AFTER import, EXCLUDING entity-specific translations
                // Entity-specific translations are managed separately and should not be processed by AutoTranslationService
                var spanishQuery = Queryable.Where(localizationSet, s => s.LocalizationCultureId == spanishCulture.Id
                    && !s.ResourceKey.StartsWith("ProductApplicationType."));
                var spanishStringsList = await spanishQuery.ToListAsync(cancellationToken);
                
                // Note: Duplicate keys in the database are fine - IStringLocalizer matches by both Key AND ResourceKey
                // The numbering (#1, #2, etc.) only exists in JSON/text files for organization
                // Database entries should always use base keys so IStringLocalizer can find them
                
                // NOW: Handle duplicate keys - prefer entries with ResourceKey = "Index" for language-section-* keys
                var spanishStrings = new Dictionary<string, LocalizationString>();
                var duplicateKeys = new HashSet<string>();
                
                foreach (var spanishString in spanishStringsList)
                {
                    if (spanishStrings.ContainsKey(spanishString.Key))
                    {
                        var existing = spanishStrings[spanishString.Key];
                        
                        // For language-section-* keys, prefer ResourceKey = "Index"
                        var shouldPreferIndex = spanishString.Key.StartsWith("language-section-");
                        
                        if (shouldPreferIndex)
                        {
                            // If new entry has Index and existing doesn't, replace it
                            if (spanishString.ResourceKey == "Index" && existing.ResourceKey != "Index")
                            {
                                _logger.LogInformation("AutoTranslationService: Replacing duplicate key '{Key}' - using entry with ResourceKey=Index (ID: {NewId}) instead of ResourceKey={OldResourceKey} (ID: {OldId})", 
                                    spanishString.Key, spanishString.Id, existing.ResourceKey, existing.Id);
                                spanishStrings[spanishString.Key] = spanishString;
                            }
                            // If existing has Index and new doesn't, keep existing
                            else if (existing.ResourceKey == "Index" && spanishString.ResourceKey != "Index")
                            {
                                _logger.LogDebug("AutoTranslationService: Keeping existing entry for key '{Key}' with ResourceKey=Index (ID: {ExistingId}), ignoring duplicate with ResourceKey={NewResourceKey} (ID: {NewId})", 
                                    spanishString.Key, existing.Id, spanishString.ResourceKey, spanishString.Id);
                            }
                            // Both have same ResourceKey or neither has Index - log warning
                            else if (!duplicateKeys.Contains(spanishString.Key))
                            {
                                _logger.LogWarning("AutoTranslationService: Found duplicate key '{Key}' in Spanish translations. Keeping first occurrence (ID: {FirstId}, ResourceKey: {FirstResourceKey}), ignoring duplicate (ID: {DuplicateId}, ResourceKey: {DuplicateResourceKey})", 
                                    spanishString.Key, existing.Id, existing.ResourceKey, spanishString.Id, spanishString.ResourceKey);
                                duplicateKeys.Add(spanishString.Key);
                            }
                        }
                        else
                        {
                            // For other keys, just log the duplicate
                            if (!duplicateKeys.Contains(spanishString.Key))
                            {
                                _logger.LogWarning("AutoTranslationService: Found duplicate key '{Key}' in Spanish translations. Keeping first occurrence (ID: {FirstId}), ignoring duplicate (ID: {DuplicateId})", 
                                    spanishString.Key, existing.Id, spanishString.Id);
                                duplicateKeys.Add(spanishString.Key);
                            }
                        }
                    }
                    else
                    {
                        spanishStrings[spanishString.Key] = spanishString;
                    }
                }

                // Find missing Spanish translations (new keys)
                var missingTranslations = englishStrings
                    .Where(e => !spanishStrings.ContainsKey(e.Key))
                    .ToList();

                // Find changed English strings (text changed but key exists)
                // A string is considered changed if:
                // 1. Spanish exists but Spanish text equals current English text (meaning it was never translated or English changed)
                // 2. Or if we want to be more precise, we could track the original English text, but for now we'll use the simpler approach
                var changedTranslations = englishStrings
                    .Where(e => spanishStrings.ContainsKey(e.Key))
                    .Where(e =>
                    {
                        var spanish = spanishStrings[e.Key];
                        var englishText = e.CurrentText ?? e.DefaultText;
                        var spanishText = spanish.CurrentText ?? spanish.DefaultText;
                        
                        // If Spanish text matches English text, it means either:
                        // - It was never translated (Spanish was created with English text)
                        // - English changed and Spanish wasn't updated yet
                        // In both cases, we should re-translate
                        return !string.IsNullOrWhiteSpace(englishText) && 
                               !string.IsNullOrWhiteSpace(spanishText) &&
                               spanishText == englishText;
                    })
                    .ToList();

                // Find removed English strings (keys that exist in Spanish but not in English)
                var removedKeys = spanishStrings.Keys
                    .Where(spanishKey => !englishStrings.Any(e => e.Key == spanishKey))
                    .ToList();

                var totalChanges = missingTranslations.Count + changedTranslations.Count + removedKeys.Count;
                
                // Initialize counters (declared early so they can be used in the blank entries creation)
                var createdCount = 0;
                var updatedCount = 0;
                var translatedCount = 0;
                
                // Ensure ALL English keys have Spanish entries (even if blank) so IStringLocalizer returns empty string instead of key name
                var allEnglishKeys = englishStrings.Select(e => e.Key).ToHashSet();
                var allSpanishKeys = spanishStrings.Keys.ToHashSet();
                var keysNeedingEntries = allEnglishKeys.Except(allSpanishKeys).ToList();
                
                if (keysNeedingEntries.Any())
                {
                    _logger.LogInformation("AutoTranslationService: Found {Count} English keys missing Spanish entries. Creating blank entries so they return empty string instead of key name.", 
                        keysNeedingEntries.Count);
                    
                    foreach (var key in keysNeedingEntries)
                    {
                        // For language-section-* keys, IStringLocalizer<Index> requires ResourceKey = "Index"
                        var expectedResourceKey = key.StartsWith("language-section-") 
                            ? "Index" 
                            : null;
                        
                        // Find English string, preferring the expected ResourceKey if specified
                        var englishString = expectedResourceKey != null
                            ? englishStrings.FirstOrDefault(e => e.Key == key && e.ResourceKey == expectedResourceKey)
                              ?? englishStrings.FirstOrDefault(e => e.Key == key && e.ResourceKey == "Index")
                              ?? englishStrings.FirstOrDefault(e => e.Key == key)
                            : englishStrings.FirstOrDefault(e => e.Key == key);
                        
                        if (englishString != null)
                        {
                            // Use expected ResourceKey if specified, otherwise use the English string's ResourceKey
                            var correctResourceKey = expectedResourceKey ?? englishString.ResourceKey;
                            
                            // Create blank entry with empty string (so IStringLocalizer returns empty, not key name)
                            var blankSpanishString = LocalizationString.Create(
                                localizationCultureId: spanishCulture.Id,
                                resourceKey: correctResourceKey,
                                key: englishString.Key,
                                defaultText: "" // Empty string so it returns empty, not key name
                            );
                            
                            db.Set<LocalizationString>().Add(blankSpanishString);
                            spanishStrings[key] = blankSpanishString; // Add to dictionary so it's included in processing
                            createdCount++;
                            
                            // Update cache immediately
                            var culture = spanishCulture.Culture;
                            if (!string.IsNullOrWhiteSpace(culture))
                            {
                                TranslationHelper.UpdateCacheEntry(culture, correctResourceKey, englishString.Key, "");
                            }
                            
                            _logger.LogDebug("AutoTranslationService: Created blank entry for key: {Key} with ResourceKey: {ResourceKey}", 
                                key, correctResourceKey);
                        }
                    }
                    
                    // Save blank entries before processing translations
                    await db.SaveChangesAsync(cancellationToken);
                    _logger.LogInformation("AutoTranslationService: Created {Count} blank Spanish entries", keysNeedingEntries.Count);
                }
                
                // Always create/update JSON and text files, even if there are no changes
                // This ensures the files exist for manual translation
                if (totalChanges == 0 && !keysNeedingEntries.Any())
                {
                    _logger.LogInformation("All Spanish translations are up to date. Updating translation files...");
                    // Continue to file creation/update below
                }

                _logger.LogInformation("Found translation changes:");
                _logger.LogInformation("  New keys: {NewCount}", missingTranslations.Count);
                _logger.LogInformation("  Changed keys: {ChangedCount}", changedTranslations.Count);
                _logger.LogInformation("  Removed keys: {RemovedCount}", removedKeys.Count);

                // Remove deleted keys from Spanish translations
                if (removedKeys.Any())
                {
                    foreach (var removedKey in removedKeys)
                    {
                        var spanishToRemove = spanishStrings[removedKey];
                        db.Set<LocalizationString>().Remove(spanishToRemove);
                        _logger.LogInformation("Removed Spanish translation for deleted key: {Key}", removedKey);
                    }
                }

                // Combine new and changed translations for processing
                var allStringsToProcess = missingTranslations
                    .Concat(changedTranslations)
                    .ToList();

                // Check if translation API is configured
                var translationProvider = _configuration["Translation:Provider"] ?? "Azure";
                var apiKey = translationProvider.Equals("Azure", StringComparison.OrdinalIgnoreCase)
                    ? _configuration["Translation:Azure:ApiKey"]
                    : _configuration["Translation:Google:ApiKey"];

                var isApiConfigured = !string.IsNullOrWhiteSpace(apiKey);
                var apiFailed = false;

                if (!isApiConfigured)
                {
                    _logger.LogWarning("");
                    _logger.LogWarning("═══════════════════════════════════════════════════════════════");
                    _logger.LogWarning("TRANSLATION API NOT CONFIGURED");
                    _logger.LogWarning("═══════════════════════════════════════════════════════════════");
                    _logger.LogWarning("Found {Count} strings that need translation (new: {New}, changed: {Changed}).", 
                        allStringsToProcess.Count, missingTranslations.Count, changedTranslations.Count);
                    _logger.LogWarning("");
                    _logger.LogWarning("To enable automatic translation, configure your API key in appsettings.json:");
                    _logger.LogWarning("  For Azure Translator: Set Translation:Azure:ApiKey");
                    _logger.LogWarning("  For Google Translate: Set Translation:Google:ApiKey");
                    _logger.LogWarning("");
                    _logger.LogWarning("Creating translation file with English text for manual/AI translation...");
                    _logger.LogWarning("═══════════════════════════════════════════════════════════════");
                    _logger.LogWarning("");
                }

                foreach (var englishString in allStringsToProcess)
                {
                    try
                    {
                        // Use CurrentText if available, otherwise DefaultText
                        var englishText = englishString.CurrentText ?? englishString.DefaultText;
                        
                        if (string.IsNullOrWhiteSpace(englishText))
                        {
                            _logger.LogWarning("English string has no text for key: {Key}", englishString.Key);
                            continue;
                        }

                        string? translatedText = null;
                        bool translationFailed = false;

                        if (isApiConfigured)
                        {
                            try
                            {
                                // Use API translation
                                if (translationProvider.Equals("Azure", StringComparison.OrdinalIgnoreCase))
                                {
                                    translatedText = await TranslateWithAzureAsync(englishText, cancellationToken);
                                }
                                else if (translationProvider.Equals("Google", StringComparison.OrdinalIgnoreCase))
                                {
                                    translatedText = await TranslateWithGoogleAsync(englishText, cancellationToken);
                                }
                                else
                                {
                                    _logger.LogWarning("Unknown translation provider: {Provider}. Supported: Azure, Google", translationProvider);
                                    translationFailed = true;
                                    apiFailed = true;
                                }

                                if (string.IsNullOrWhiteSpace(translatedText) && isApiConfigured)
                                {
                                    translationFailed = true;
                                    apiFailed = true;
                                }
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning(ex, "API translation failed for key {Key}: {Message}", englishString.Key, ex.Message);
                                translationFailed = true;
                                apiFailed = true;
                            }
                        }

                        // Check if this is an update to existing translation or a new one
                        var isUpdate = changedTranslations.Contains(englishString);

                        // Use translated text if available, otherwise leave blank (not English)
                        var finalText = !string.IsNullOrWhiteSpace(translatedText) ? translatedText : "";
                        
                        // Also update JSON file with translation (or empty string if failed)
                        // Always set to empty string (not null) so IStringLocalizer returns empty string instead of key name
                        if (!string.IsNullOrWhiteSpace(translatedText))
                        {
                            existingTranslations[englishString.Key] = translatedText;
                        }
                        else
                        {
                            // Always set to empty string when translation is blank (so it returns empty, not key name)
                            existingTranslations[englishString.Key] = "";
                        }
                        
                        // For language-section-* keys, IStringLocalizer<Index> requires ResourceKey = "Index"
                        var expectedResourceKey = englishString.Key.StartsWith("language-section-") 
                            ? "Index" 
                            : null;
                        
                        // Use expected ResourceKey if specified, otherwise use the English string's ResourceKey
                        var correctResourceKey = expectedResourceKey ?? englishString.ResourceKey;
                        
                        if (isUpdate)
                        {
                            // Update existing Spanish translation in database
                            var existingSpanish = spanishStrings[englishString.Key];
                            
                            // If ResourceKey is wrong, create a new entry with correct ResourceKey
                            if (expectedResourceKey != null && existingSpanish.ResourceKey != expectedResourceKey)
                            {
                                _logger.LogWarning("AutoTranslationService: Found Spanish entry for key: {Key} with wrong ResourceKey: {WrongResourceKey}. Expected: {CorrectResourceKey}. Creating new entry.", 
                                    englishString.Key, existingSpanish.ResourceKey, expectedResourceKey);
                                
                                // Create new entry with correct ResourceKey
                                var newSpanishString = LocalizationString.Create(
                                    localizationCultureId: spanishCulture.Id,
                                    resourceKey: expectedResourceKey,
                                    key: englishString.Key,
                                    defaultText: finalText
                                );
                                
                                db.Set<LocalizationString>().Add(newSpanishString);
                                spanishStrings[englishString.Key] = newSpanishString; // Update dictionary
                                createdCount++;
                                
                                // Update cache immediately
                                var culture = spanishCulture.Culture;
                                if (!string.IsNullOrWhiteSpace(culture))
                                {
                                    TranslationHelper.UpdateCacheEntry(culture, expectedResourceKey, englishString.Key, finalText);
                                }
                            }
                            else
                            {
                                existingSpanish.UpdateDefault(finalText);
                                updatedCount++;
                                
                                // Update cache immediately
                                var culture = spanishCulture.Culture;
                                if (!string.IsNullOrWhiteSpace(culture))
                                {
                                    TranslationHelper.UpdateCacheEntry(culture, correctResourceKey, englishString.Key, finalText);
                                }
                            }
                        }
                        else
                        {
                            // Create new Spanish translation in database
                            var spanishString = LocalizationString.Create(
                                localizationCultureId: spanishCulture.Id,
                                resourceKey: correctResourceKey,
                                key: englishString.Key,
                                defaultText: finalText
                            );

                            db.Set<LocalizationString>().Add(spanishString);
                            createdCount++;
                            
                            // Update cache immediately
                            var culture = spanishCulture.Culture;
                            if (!string.IsNullOrWhiteSpace(culture))
                            {
                                TranslationHelper.UpdateCacheEntry(culture, correctResourceKey, englishString.Key, finalText);
                            }
                            
                            _logger.LogDebug("AutoTranslationService: Created new translation for key: {Key} with ResourceKey: {ResourceKey}", 
                                englishString.Key, correctResourceKey);
                        }

                        if (!string.IsNullOrWhiteSpace(translatedText))
                        {
                            translatedCount++;
                            _logger.LogDebug("Translated: {Key} -> {Translation}", englishString.Key, translatedText);
                        }
                        else if (isApiConfigured && translationFailed)
                        {
                            _logger.LogWarning("Translation failed for key: {Key}. Added English text for manual translation.", englishString.Key);
                        }
                        else if (!isApiConfigured)
                        {
                            if (isUpdate)
                            {
                                _logger.LogInformation("Updated entry with English text: {Key} (Resource: {ResourceKey})", 
                                    englishString.Key, englishString.ResourceKey);
                            }
                            else
                            {
                                _logger.LogInformation("Added entry with English text: {Key} (Resource: {ResourceKey})", 
                                    englishString.Key, englishString.ResourceKey);
                            }
                        }

                        // Small delay to avoid rate limiting (only if using API successfully)
                        if (isApiConfigured && !string.IsNullOrWhiteSpace(translatedText))
                        {
                            await Task.Delay(100, cancellationToken);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing key {Key}: {Message}", englishString.Key, ex.Message);
                        // Add blank entry if it doesn't exist
                        if (!existingTranslations.ContainsKey(englishString.Key))
                        {
                            existingTranslations[englishString.Key] = "";
                        }
                        // Continue with next string
                    }
                }

                // Always create/update JSON and text files with all English strings
                // Build lookup of existing Spanish DB translations keyed by (baseKey, resourceKey)
                // EXCLUDE entity-specific translations (they're managed separately)
                var spanishQueryForFiles = Queryable.Where(localizationSet, s => s.LocalizationCultureId == spanishCulture.Id
                    && !s.ResourceKey.StartsWith("ProductApplicationType."));
                var spanishStringsListForFiles = await spanishQueryForFiles.ToListAsync(cancellationToken);

                var spanishByKeyAndResource = spanishStringsListForFiles
                    .GroupBy(s => new
                    {
                        BaseKey = s.Key.Contains('#') ? s.Key.Substring(0, s.Key.IndexOf('#')) : s.Key,
                        s.ResourceKey
                    })
                    .ToDictionary(
                        g => (Key: g.Key.BaseKey, g.Key.ResourceKey),
                        g => g.OrderBy(x => x.Key.Length)
                              .Select(x => x.CurrentText ?? x.DefaultText ?? string.Empty)
                              .FirstOrDefault() ?? string.Empty
                    );

                var finalNumberedTranslations = new Dictionary<string, string>();

                // Per-key numbering: key#1, key#2, etc.
                var englishGroupsForFiles = englishStrings
                    .OrderBy(s => s.Key)
                    .ThenByDescending(s => s.ResourceKey == "Index")
                    .ThenBy(s => s.ResourceKey)
                    .ThenBy(s => s.Id)
                    .GroupBy(s => s.Key);

                foreach (var group in englishGroupsForFiles)
                {
                    var originalKey = group.Key;
                    var occurrence = 1;

                    foreach (var englishString in group)
                    {
                        var numberedKey = $"{originalKey}#{occurrence}";

                        string translation = string.Empty;

                        // 1) Prefer the Spanish text already in the DB for this key + resource
                        if (!spanishByKeyAndResource.TryGetValue((originalKey, englishString.ResourceKey), out translation!))
                        {
                            translation = string.Empty;
                        }

                        // 2) If DB is empty, fall back to whatever is in the JSON/text dictionaries
                        if (string.IsNullOrWhiteSpace(translation))
                        {
                            if (!existingTranslations.TryGetValue(numberedKey, out translation!))
                            {
                                existingTranslations.TryGetValue(originalKey, out translation!);
                            }
                        }

                        finalNumberedTranslations[numberedKey] = translation ?? string.Empty;
                        occurrence++;
                    }
                }

                // Save numbered keys to JSON file (always, even if no changes)
                await SaveTranslationsJsonAsync(jsonFilePath, finalNumberedTranslations, cancellationToken);
                _logger.LogInformation("AutoTranslationService: Saved {Count} translations to JSON file", finalNumberedTranslations.Count);

                // Update text file with numbered keys (pass finalNumberedTranslations so it uses numbered keys)
                await UpdateTextFileFromJsonAsync(textFilePath, jsonFilePath, englishStrings, finalNumberedTranslations, cancellationToken);

                // No need to re-import here; DB is already up-to-date from earlier + direct updates
                
                if (apiFailed && isApiConfigured)
                {
                    _logger.LogWarning("");
                    _logger.LogWarning("═══════════════════════════════════════════════════════════════");
                    _logger.LogWarning("TRANSLATION API CALLS FAILED");
                    _logger.LogWarning("═══════════════════════════════════════════════════════════════");
                    _logger.LogWarning("Some translations failed. Check the translation files for blank entries.");
                    _logger.LogWarning("═══════════════════════════════════════════════════════════════");
                    _logger.LogWarning("");
                }

                if (createdCount > 0 || updatedCount > 0 || removedKeys.Count > 0)
                {
                    await db.SaveChangesAsync(cancellationToken);
                    
                    if (isApiConfigured && translatedCount > 0)
                    {
                        _logger.LogInformation("Successfully processed translations:");
                        _logger.LogInformation("  Translated: {TranslatedCount}", translatedCount);
                        if (createdCount > translatedCount)
                        {
                            _logger.LogInformation("  Created (needs translation): {Count}", createdCount - translatedCount);
                        }
                        if (updatedCount > translatedCount - (createdCount - (createdCount - translatedCount)))
                        {
                            _logger.LogInformation("  Updated (needs translation): {Count}", updatedCount - (translatedCount - (createdCount - (createdCount - translatedCount))));
                        }
                    }
                    else
                    {
                        _logger.LogInformation("Processed {CreatedCount} new and {UpdatedCount} updated entries. Please translate them using the generated JSON file.", 
                            createdCount, updatedCount);
                    }
                    
                    if (removedKeys.Count > 0)
                    {
                        _logger.LogInformation("Removed {Count} obsolete translation entries.", removedKeys.Count);
                    }
                }

                return createdCount + updatedCount;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in FillMissingTranslationsAsync");
                throw;
            }
        }

        private string GetTranslationsDirectory()
        {
            var currentDir = Directory.GetCurrentDirectory();
            
            var possibleServicePaths = new[]
            {
                Path.Combine(currentDir, "..", "Aloha.Domain.Services"),
                Path.Combine(currentDir, "..", "..", "Aloha.Domain.Services"),
                Path.Combine(currentDir, "..", "..", "..", "Aloha.Domain.Services"),
                Path.Combine(currentDir, "Aloha.Domain.Services"),
            };
            
            var serviceDir = possibleServicePaths
                .Select(p => Path.GetFullPath(p))
                .FirstOrDefault(p => Directory.Exists(p) && Path.GetFileName(p) == "Aloha.Domain.Services");
            
            if (serviceDir != null)
            {
                var translationsDir = Path.Combine(serviceDir, "Translations");
                Directory.CreateDirectory(translationsDir);
                return translationsDir;
            }
            else
            {
                var translationsDir = Path.Combine(currentDir, "Translations");
                Directory.CreateDirectory(translationsDir);
                return translationsDir;
            }
        }

        private async Task<Dictionary<string, string>> LoadExistingTranslationsAsync(string jsonFilePath, CancellationToken cancellationToken)
        {
            var translations = new Dictionary<string, string>();
            
            if (File.Exists(jsonFilePath))
            {
                try
                {
                    var jsonContent = await File.ReadAllTextAsync(jsonFilePath, cancellationToken);
                    var jsonDict = JsonSerializer.Deserialize<Dictionary<string, string>>(jsonContent);
                    if (jsonDict != null)
                    {
                        foreach (var kvp in jsonDict)
                        {
                            translations[kvp.Key] = kvp.Value ?? string.Empty;
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error loading existing translations JSON. Starting fresh.");
                }
            }
            
            return translations;
        }

        private async Task SaveTranslationsJsonAsync(string jsonFilePath, Dictionary<string, string> translations, CancellationToken cancellationToken)
        {
            try
            {
                var jsonContent = JsonSerializer.Serialize(translations, new JsonSerializerOptions
                {
                    WriteIndented = true,
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                });
                
                await File.WriteAllTextAsync(jsonFilePath, jsonContent, cancellationToken);
                _logger.LogInformation("AutoTranslationService: Saved {Count} translations to JSON file", translations.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving translations JSON: {Message}", ex.Message);
                throw;
            }
        }

        private async Task ImportJsonTranslationsToDatabaseAsync(
            Microsoft.EntityFrameworkCore.DbContext db,
            LocalizationCulture spanishCulture,
            Dictionary<string, string> jsonTranslations,
            Dictionary<string, string>? keyNumberMap,
            CancellationToken cancellationToken)
        {
            try
            {
                var localizationSet = db.Set<LocalizationString>();

                // Load existing Spanish strings for this culture, EXCLUDING entity-specific translations
                // Entity-specific translations are managed separately and should not be processed by AutoTranslationService
                var spanishQuery = Queryable.Where(localizationSet, s => s.LocalizationCultureId == spanishCulture.Id
                    && !s.ResourceKey.StartsWith("ProductApplicationType."));
                var spanishStringsList = await spanishQuery.ToListAsync(cancellationToken);

                // Find English culture
                var englishCulture = await db.Set<LocalizationCulture>()
                    .FirstOrDefaultAsync(c => EF.Property<string>(c, "Culture") == "en-US", cancellationToken);

                if (englishCulture == null)
                {
                    _logger.LogWarning("AutoTranslationService: English culture (en-US) not found when importing JSON translations.");
                    return;
                }

                // Load all English strings, EXCLUDING entity-specific translations
                // Entity-specific translations are managed separately and should not be processed by AutoTranslationService
                var englishStringsAll = await localizationSet
                    .Where(s => s.LocalizationCultureId == englishCulture.Id
                        && !s.ResourceKey.StartsWith("ProductApplicationType."))
                    .ToListAsync(cancellationToken);

                // Group and order English by key, build (key, index) → EnglishString map
                var englishByKeyAndIndex = new Dictionary<(string Key, int Index), LocalizationString>();

                var englishGroups = englishStringsAll
                    .OrderBy(s => s.Key)
                    .ThenByDescending(s => s.ResourceKey == "Index") // keep Index first
                    .ThenBy(s => s.ResourceKey)
                    .ThenBy(s => s.Id)
                    .GroupBy(s => s.Key);

                foreach (var group in englishGroups)
                {
                    int occurrence = 1;
                    foreach (var englishString in group)
                    {
                        englishByKeyAndIndex[(group.Key, occurrence)] = englishString;
                        occurrence++;
                    }
                }

                var importedCount = 0;
                var updatedCount = 0;

                foreach (var kvp in jsonTranslations)
                {
                    var numberedKey = kvp.Key;
                    var translationValue = kvp.Value ?? string.Empty;

                    // Process all translations, including blank ones
                    // This ensures that:
                    // - Empty DB fields get filled when JSON has a value
                    // - DB fields get updated when JSON has a different value (typo fixes, etc.)
                    // - DB fields get cleared when JSON is empty

                    // Parse base key and index from something like "page-heading#3"
                    string baseKey;
                    int occurrenceIndex;

                    var hashIndex = numberedKey.IndexOf('#');
                    if (hashIndex < 0)
                    {
                        baseKey = numberedKey;
                        occurrenceIndex = 1;
                    }
                    else
                    {
                        baseKey = numberedKey.Substring(0, hashIndex);
                        var indexPart = numberedKey.Substring(hashIndex + 1);
                        occurrenceIndex = int.TryParse(indexPart, out var parsed) && parsed > 0 ? parsed : 1;
                    }

                    // Allow keyNumberMap override if you ever pass richer info in the future
                    if (keyNumberMap != null && keyNumberMap.TryGetValue(numberedKey, out var mappedBaseKey) &&
                        !string.IsNullOrWhiteSpace(mappedBaseKey))
                    {
                        baseKey = mappedBaseKey;
                    }

                    // Locate the matching English string for this key and occurrence
                    if (!englishByKeyAndIndex.TryGetValue((baseKey, occurrenceIndex), out var englishString))
                    {
                        // Fallback: try first occurrence for this key
                        if (!englishByKeyAndIndex.TryGetValue((baseKey, 1), out englishString!))
                        {
                            _logger.LogWarning(
                                "AutoTranslationService: Could not find English string for key '{Key}' index {Index} when importing JSON translation.",
                                baseKey, occurrenceIndex);
                            continue;
                        }
                    }

                    var correctResourceKey = englishString.ResourceKey;

                    // Find an existing Spanish entry with same ResourceKey and either:
                    // - exactly the base key
                    // - exactly the numbered key
                    // - or a key starting with "baseKey#"
                    var candidates = spanishStringsList
                        .Where(s => s.ResourceKey == correctResourceKey &&
                                    (s.Key == baseKey || s.Key == numberedKey || s.Key.StartsWith(baseKey + "#")))
                        .OrderBy(s => s.Key == baseKey ? 0 : 1)
                        .ThenBy(s => s.Key.Length)
                        .ToList();

                    var existingString = candidates.FirstOrDefault();

                    if (existingString != null)
                    {
                        var currentText = existingString.CurrentText ?? existingString.DefaultText ?? string.Empty;

                        // Always update if the values differ (including empty -> value, value -> empty, or value -> different value)
                        if (!string.Equals(currentText, translationValue, StringComparison.Ordinal))
                        {
                            existingString.UpdateDefault(translationValue);
                            updatedCount++;
                            
                            // Update cache immediately
                            var culture = spanishCulture.Culture;
                            if (!string.IsNullOrWhiteSpace(culture))
                            {
                                TranslationHelper.UpdateCacheEntry(culture, correctResourceKey, baseKey, translationValue);
                            }
                            
                            var changeDescription = string.IsNullOrWhiteSpace(currentText) && !string.IsNullOrWhiteSpace(translationValue)
                                ? "filled empty field with"
                                : !string.IsNullOrWhiteSpace(currentText) && string.IsNullOrWhiteSpace(translationValue)
                                ? "cleared field to"
                                : "updated field to";
                            
                            _logger.LogInformation(
                                "AutoTranslationService: Updated database entry for key: {Key} (Resource: {ResourceKey}) - {Description} translation from JSON",
                                baseKey, correctResourceKey, changeDescription);
                        }
                        else
                        {
                            _logger.LogDebug(
                                "AutoTranslationService: Skipping update for key: {Key} (Resource: {ResourceKey}) - text already matches JSON",
                                baseKey, correctResourceKey);
                        }
                    }
                    else
                    {
                        // Create new Spanish translation (even if empty, so IStringLocalizer returns empty string instead of key name)
                        var spanishString = LocalizationString.Create(
                            localizationCultureId: spanishCulture.Id,
                            resourceKey: correctResourceKey,
                            key: baseKey, // DB keeps base key; numbering is for the file/JSON only
                            defaultText: translationValue // Can be empty string
                        );

                        db.Set<LocalizationString>().Add(spanishString);
                        spanishStringsList.Add(spanishString); // keep in local list for subsequent matches
                        importedCount++;
                        
                        // Update cache immediately
                        var culture = spanishCulture.Culture;
                        if (!string.IsNullOrWhiteSpace(culture))
                        {
                            TranslationHelper.UpdateCacheEntry(culture, correctResourceKey, baseKey, translationValue);
                        }

                        _logger.LogInformation(
                            "AutoTranslationService: Created database entry for key: {Key} (Resource: {ResourceKey}) with value: {Value}",
                            baseKey, correctResourceKey,
                            string.IsNullOrWhiteSpace(translationValue) ? "[empty string]" : translationValue);
                    }
                }

                if (importedCount > 0 || updatedCount > 0)
                {
                    await db.SaveChangesAsync(cancellationToken);
                    _logger.LogInformation(
                        "AutoTranslationService: Imported {Imported} new and updated {Updated} Spanish translations from JSON to database",
                        importedCount, updatedCount);
                }
                else
                {
                    _logger.LogInformation("AutoTranslationService: All JSON translations already exist in database");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing JSON translations to database: {Message}", ex.Message);
            }
        }

        private async Task UpdateTextFileFromJsonAsync(
            string textFilePath,
            string jsonFilePath,
            List<LocalizationString> englishStrings,
            Dictionary<string, string>? numberedTranslations,
            CancellationToken cancellationToken)
        {
            try
            {
                // Use numbered translations if provided, otherwise load from JSON
                var translations = numberedTranslations ?? await LoadExistingTranslationsAsync(jsonFilePath, cancellationToken);

                var lines = new List<string>();
                lines.Add("Spanish Translation File - Edit the Spanish column and save");
                lines.Add("=".PadRight(80, '='));
                lines.Add("");
                lines.Add("Format: Key | English Text | Spanish Text");
                lines.Add("-".PadRight(80, '-'));
                lines.Add("");

                // Group by key and number OCCURRENCES PER KEY:
                // man#1, woman#1, man#2, woman#2, etc.
                var englishGroups = englishStrings
                    .OrderBy(s => s.Key)
                    .ThenByDescending(s => s.ResourceKey == "Index")  // keep Index first where it exists
                    .ThenBy(s => s.ResourceKey)
                    .ThenBy(s => s.Id)
                    .GroupBy(s => s.Key);

                foreach (var group in englishGroups)
                {
                    var originalKey = group.Key;
                    var occurrence = 1;

                    foreach (var englishString in group)
                    {
                        var numberedKey = $"{originalKey}#{occurrence}";
                        var keyForFile = numberedKey; // always show the #id in the file

                        var english = (englishString.CurrentText ?? englishString.DefaultText ?? string.Empty)
                            .Replace("\r\n", " ")
                            .Replace("\n", " ")
                            .Replace("\r", " ");

                        // Prefer a translation specifically for this numbered occurrence, then fall back to base key
                        string spanish = string.Empty;
                        if (!translations.TryGetValue(numberedKey, out spanish!))
                        {
                            translations.TryGetValue(originalKey, out spanish!);
                        }

                        lines.Add(keyForFile);
                        lines.Add($"  English: {english}");
                        lines.Add($"  Spanish: {spanish}");
                        lines.Add("");

                        occurrence++;
                    }
                }

                lines.Add("=".PadRight(80, '='));
                lines.Add("Instructions:");
                lines.Add("1. Fill in the 'Spanish:' line for each entry");
                lines.Add("2. Save this file - changes will be synced to JSON on next application start");
                lines.Add("3. You can also edit the corresponding JSON file directly");

                await File.WriteAllLinesAsync(textFilePath, lines, cancellationToken);
                _logger.LogInformation("AutoTranslationService: Updated text file with current translations");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating text file: {Message}", ex.Message);
            }
        }

        // OLD METHODS - TO BE REMOVED
        private async Task CreateTranslationFileAsync(
            List<(string Key, string ResourceKey, string EnglishText, bool IsUpdate)> stringsToTranslate,
            CancellationToken cancellationToken)
        {
            try
            {
                // Try to find the Aloha.Domain.Services project folder
                // Look for it relative to current directory or in common project structures
                var currentDir = Directory.GetCurrentDirectory();
                _logger.LogInformation("AutoTranslationService: Current directory: {CurrentDir}", currentDir);
                
                string outputDir;
                
                // Try to find Aloha.Domain.Services folder, then create Translations inside it
                // Common structures: ../Aloha.Domain.Services or ../../Aloha.Domain.Services
                var possibleServicePaths = new[]
                {
                    Path.Combine(currentDir, "..", "Aloha.Domain.Services"),
                    Path.Combine(currentDir, "..", "..", "Aloha.Domain.Services"),
                    Path.Combine(currentDir, "..", "..", "..", "Aloha.Domain.Services"),
                    Path.Combine(currentDir, "Aloha.Domain.Services"),
                };
                
                var serviceDir = possibleServicePaths
                    .Select(p => Path.GetFullPath(p))
                    .FirstOrDefault(p => Directory.Exists(p) && Path.GetFileName(p) == "Aloha.Domain.Services");
                
                // If found, use Aloha.Domain.Services/Translations
                if (serviceDir != null)
                {
                    outputDir = Path.Combine(serviceDir, "Translations");
                    _logger.LogInformation("AutoTranslationService: Found Aloha.Domain.Services folder. Using: {OutputDir}", Path.GetFullPath(outputDir));
                }
                else
                {
                    // If not found, fall back to current directory with capital T
                    outputDir = Path.Combine(currentDir, "Translations");
                    _logger.LogWarning("AutoTranslationService: Could not find Aloha.Domain.Services folder. Using current directory: {OutputDir}", Path.GetFullPath(outputDir));
                }
                
                Directory.CreateDirectory(outputDir);
                _logger.LogInformation("AutoTranslationService: Translations directory: {OutputDir}", outputDir);

                var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
                var jsonFilePath = Path.Combine(outputDir, $"es-CR_translations_{timestamp}.json");
                var fullPath = Path.GetFullPath(jsonFilePath);
                _logger.LogInformation("AutoTranslationService: Full file path: {FullPath}", fullPath);

                // Create JSON file (structured format)
                var jsonData = stringsToTranslate.Select(s => new
                {
                    Key = s.Key,
                    ResourceKey = s.ResourceKey,
                    EnglishText = s.EnglishText,
                    SpanishText = "", // Empty for translation
                    IsUpdate = s.IsUpdate
                }).ToList();

                var jsonContent = JsonSerializer.Serialize(jsonData, new JsonSerializerOptions
                {
                    WriteIndented = true,
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                });

                await File.WriteAllTextAsync(jsonFilePath, jsonContent, cancellationToken);

                // Create condensed text file alongside JSON
                var textFilePath = Path.Combine(outputDir, $"es-CR_translations_{timestamp}.txt");
                await CreateCondensedTextFileAsync(textFilePath, stringsToTranslate, cancellationToken);

                _logger.LogInformation("");
                _logger.LogInformation("═══════════════════════════════════════════════════════════════");
                _logger.LogInformation("TRANSLATION FILES CREATED");
                _logger.LogInformation("═══════════════════════════════════════════════════════════════");
                _logger.LogInformation("JSON file location: {JsonPath}", jsonFilePath);
                _logger.LogInformation("Text file location: {TextPath}", textFilePath);
                _logger.LogInformation("");
                _logger.LogInformation("Instructions:");
                _logger.LogInformation("  1. Open the TEXT file from the 'Translations' folder (easier to edit)");
                _logger.LogInformation("  2. Fill in the Spanish translations next to each English text");
                _logger.LogInformation("  3. Save the text file - it will be synced to JSON on next boot");
                _logger.LogInformation("  4. Or edit the JSON file directly if you prefer");
                _logger.LogInformation("");
                _logger.LogInformation("The translations folder is located at:");
                _logger.LogInformation("  {TranslationDir}", Path.GetFullPath(outputDir));
                _logger.LogInformation("═══════════════════════════════════════════════════════════════");
                _logger.LogInformation("");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating translation file: {Message}", ex.Message);
            }
        }

        private async Task CreateCondensedTextFileAsync(
            string textFilePath,
            List<(string Key, string ResourceKey, string EnglishText, bool IsUpdate)> stringsToTranslate,
            CancellationToken cancellationToken)
        {
            try
            {
                var lines = new List<string>();
                lines.Add("Spanish Translation File - Edit the Spanish column and save");
                lines.Add("=".PadRight(80, '='));
                lines.Add("");
                lines.Add("Format: Key | English Text | Spanish Text");
                lines.Add("-".PadRight(80, '-'));
                lines.Add("");

                foreach (var item in stringsToTranslate.OrderBy(s => s.Key))
                {
                    var key = item.Key;
                    var english = item.EnglishText.Replace("\r\n", " ").Replace("\n", " ").Replace("\r", " ");
                    var spanish = ""; // Empty for user to fill in
                    var updateMarker = item.IsUpdate ? " [UPDATE]" : "";
                    
                    lines.Add($"{key}{updateMarker}");
                    lines.Add($"  English: {english}");
                    lines.Add($"  Spanish: {spanish}");
                    lines.Add("");
                }

                lines.Add("=".PadRight(80, '='));
                lines.Add("Instructions:");
                lines.Add("1. Fill in the 'Spanish:' line for each entry");
                lines.Add("2. Save this file - changes will be synced to JSON on next application start");
                lines.Add("3. You can also edit the corresponding JSON file directly");

                await File.WriteAllLinesAsync(textFilePath, lines, cancellationToken);
                _logger.LogInformation("AutoTranslationService: Created condensed text file: {TextPath}", textFilePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating condensed text file: {Message}", ex.Message);
            }
        }

        private async Task SyncTextFilesToJsonAsync(CancellationToken cancellationToken)
        {
            try
            {
                var currentDir = Directory.GetCurrentDirectory();
                string translationsDir;
                
                // Find the Translations directory (same logic as CreateTranslationFileAsync)
                var possibleServicePaths = new[]
                {
                    Path.Combine(currentDir, "..", "Aloha.Domain.Services"),
                    Path.Combine(currentDir, "..", "..", "Aloha.Domain.Services"),
                    Path.Combine(currentDir, "..", "..", "..", "Aloha.Domain.Services"),
                    Path.Combine(currentDir, "Aloha.Domain.Services"),
                };
                
                var serviceDir = possibleServicePaths
                    .Select(p => Path.GetFullPath(p))
                    .FirstOrDefault(p => Directory.Exists(p) && Path.GetFileName(p) == "Aloha.Domain.Services");
                
                if (serviceDir != null)
                {
                    translationsDir = Path.Combine(serviceDir, "Translations");
                }
                else
                {
                    translationsDir = Path.Combine(currentDir, "Translations");
                }

                if (!Directory.Exists(translationsDir))
                {
                    _logger.LogDebug("AutoTranslationService: Translations directory does not exist. Skipping text file sync.");
                    return;
                }

                // Find all text files matching the pattern
                var textFiles = Directory.GetFiles(translationsDir, "es-CR_translations_*.txt");
                
                foreach (var textFile in textFiles)
                {
                    try
                    {
                        // Find corresponding JSON file (same timestamp)
                        var fileName = Path.GetFileNameWithoutExtension(textFile);
                        var jsonFile = Path.Combine(translationsDir, $"{fileName}.json");
                        
                        if (!File.Exists(jsonFile))
                        {
                            _logger.LogDebug("AutoTranslationService: No corresponding JSON file found for {TextFile}", textFile);
                            continue;
                        }

                        // Check if text file is newer than JSON file
                        var textFileInfo = new FileInfo(textFile);
                        var jsonFileInfo = new FileInfo(jsonFile);
                        
                        if (textFileInfo.LastWriteTime <= jsonFileInfo.LastWriteTime)
                        {
                            _logger.LogDebug("AutoTranslationService: Text file {TextFile} is not newer than JSON. Skipping sync.", textFile);
                            continue;
                        }

                        _logger.LogInformation("AutoTranslationService: Text file {TextFile} is newer than JSON. Syncing to JSON...", textFile);
                        
                        // Parse text file and update JSON
                        var translations = ParseTextFile(textFile);
                        if (translations.Any())
                        {
                            await UpdateJsonFromTextFile(jsonFile, translations, cancellationToken);
                            _logger.LogInformation("AutoTranslationService: Successfully synced {Count} translations from text file to JSON.", translations.Count);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error syncing text file {TextFile}: {Message}", textFile, ex.Message);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SyncTextFilesToJsonAsync: {Message}", ex.Message);
            }
        }

        private Dictionary<string, string> ParseTextFile(string textFilePath)
        {
            var translations = new Dictionary<string, string>();
            var lines = File.ReadAllLines(textFilePath);
            
            string? currentKey = null;
            string? currentSpanish = null;
            
            foreach (var line in lines)
            {
                var trimmed = line.Trim();
                
                // Skip empty lines, headers, and instructions
                if (string.IsNullOrWhiteSpace(trimmed) || 
                    trimmed.StartsWith("=") || 
                    trimmed.StartsWith("-") ||
                    trimmed.StartsWith("Spanish Translation File") ||
                    trimmed.StartsWith("Format:") ||
                    trimmed.StartsWith("Instructions:"))
                {
                    continue;
                }
                
                // Check if this is a key line (doesn't start with "English:" or "Spanish:")
                if (!trimmed.StartsWith("English:") && !trimmed.StartsWith("Spanish:"))
                {
                    // Save previous entry if we have one (allow blank Spanish)
                    if (currentKey != null && currentSpanish != null)
                    {
                        translations[currentKey] = currentSpanish;
                    }
                    
                    // Extract key (remove [UPDATE] marker if present)
                    currentKey = trimmed.Replace(" [UPDATE]", "").Trim();
                    currentSpanish = null;
                }
                else if (trimmed.StartsWith("Spanish:"))
                {
                    // Extract Spanish text (even if blank - preserve blank entries)
                    var spanishText = trimmed.Substring("Spanish:".Length).Trim();
                    currentSpanish = spanishText; // Allow blank strings
                }
            }
            
            // Save last entry (allow blank Spanish)
            if (currentKey != null && currentSpanish != null)
            {
                translations[currentKey] = currentSpanish;
            }
            
            return translations;
        }

        private async Task UpdateJsonFromTextFile(
            string jsonFilePath,
            Dictionary<string, string> translations,
            CancellationToken cancellationToken)
        {
            try
            {
                // Read existing JSON
                var jsonContent = await File.ReadAllTextAsync(jsonFilePath, cancellationToken);
                var jsonData = JsonSerializer.Deserialize<List<TranslationJsonEntry>>(jsonContent) ?? new List<TranslationJsonEntry>();
                
                // Update SpanishText for matching keys
                var updatedCount = 0;
                foreach (var entry in jsonData)
                {
                    if (translations.TryGetValue(entry.Key, out var spanishText))
                    {
                        entry.SpanishText = spanishText;
                        updatedCount++;
                    }
                }
                
                // Write updated JSON
                var updatedJsonContent = JsonSerializer.Serialize(jsonData, new JsonSerializerOptions
                {
                    WriteIndented = true,
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                });
                
                await File.WriteAllTextAsync(jsonFilePath, updatedJsonContent, cancellationToken);
                _logger.LogInformation("AutoTranslationService: Updated JSON file with {Count} translations from text file.", updatedCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating JSON from text file: {Message}", ex.Message);
                throw;
            }
        }

        private class TranslationJsonEntry
        {
            public string Key { get; set; } = string.Empty;
            public string ResourceKey { get; set; } = string.Empty;
            public string EnglishText { get; set; } = string.Empty;
            public string SpanishText { get; set; } = string.Empty;
            public bool IsUpdate { get; set; }
        }

        private async Task<string?> TranslateWithAzureAsync(string text, CancellationToken cancellationToken)
        {
            var apiKey = _configuration["Translation:Azure:ApiKey"];
            var region = _configuration["Translation:Azure:Region"] ?? "global";
            var endpoint = _configuration["Translation:Azure:Endpoint"] ?? "https://api.cognitive.microsofttranslator.com";

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("Azure Translator API key not configured. Set Translation:Azure:ApiKey in configuration.");
                return null;
            }

            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", apiKey);
            client.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Region", region);

            var route = "/translate?api-version=3.0&from=en&to=es";
            var requestBody = JsonSerializer.Serialize(new[] { new { Text = text } });
            var content = new StringContent(requestBody, System.Text.Encoding.UTF8, "application/json");

            var response = await client.PostAsync($"{endpoint}{route}", content, cancellationToken);
            response.EnsureSuccessStatusCode();

            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<AzureTranslationResponse[]>(responseBody);

            return result?[0]?.Translations?[0]?.Text;
        }

        private async Task<string?> TranslateWithGoogleAsync(string text, CancellationToken cancellationToken)
        {
            var apiKey = _configuration["Translation:Google:ApiKey"];

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("Google Translate API key not configured. Set Translation:Google:ApiKey in configuration.");
                return null;
            }

            var client = _httpClientFactory.CreateClient();
            var url = $"https://translation.googleapis.com/language/translate/v2?key={apiKey}&q={Uri.EscapeDataString(text)}&source=en&target=es";

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

        /// <summary>
        /// Deletes all Spanish (es-CR) localization strings from the database.
        /// Use this to start fresh with translations.
        /// </summary>
        public async Task<int> WipeSpanishTranslationsAsync(CancellationToken cancellationToken = default)
        {
            _logger.LogWarning("AutoTranslationService: WIPING ALL SPANISH TRANSLATIONS FROM DATABASE");
            try
            {
                await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
                
                // Get Spanish culture
                var spanishCulture = await db.Set<LocalizationCulture>()
                    .FirstOrDefaultAsync(c => EF.Property<string>(c, "Culture") == "es-CR", cancellationToken);
                
                if (spanishCulture == null)
                {
                    _logger.LogWarning("AutoTranslationService: Spanish culture (es-CR) not found. Nothing to delete.");
                    return 0;
                }
                
                // Get all Spanish strings
                var localizationSet = db.Set<LocalizationString>();
                var spanishQuery = Queryable.Where(localizationSet, s => s.LocalizationCultureId == spanishCulture.Id);
                var spanishStrings = await spanishQuery.ToListAsync(cancellationToken);
                
                var count = spanishStrings.Count;
                
                if (count == 0)
                {
                    _logger.LogInformation("AutoTranslationService: No Spanish translations found to delete.");
                    return 0;
                }
                
                // Delete all Spanish strings
                foreach (var spanishString in spanishStrings)
                {
                    db.Set<LocalizationString>().Remove(spanishString);
                }
                
                await db.SaveChangesAsync(cancellationToken);
                
                _logger.LogWarning("AutoTranslationService: DELETED {Count} Spanish translation entries from database", count);
                _logger.LogWarning("AutoTranslationService: Restart the application to regenerate translations from JSON file");
                
                return count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error wiping Spanish translations: {Message}", ex.Message);
                throw;
            }
        }
    }
}