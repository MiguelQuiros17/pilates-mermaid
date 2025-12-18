using Aloha.Domain.Localization;
using Microsoft.EntityFrameworkCore;

namespace Aloha.Domain.Services.Translations
{
    /// <summary>
    /// Helper methods for loading and saving MultilingualField values to/from the database.
    /// </summary>
    public static class MultilingualFieldHelper
    {
        /// <summary>
        /// Loads translations from the database into a MultilingualField.
        /// </summary>
        /// <param name="field">The MultilingualField to populate</param>
        /// <param name="db">The database context</param>
        /// <param name="resourceKey">The resource key (e.g., "ShareProductCategory.123")</param>
        /// <param name="key">The field key (e.g., "CategoryDisplayName")</param>
        /// <param name="primaryLanguage">The primary language code</param>
        /// <param name="entityPrimaryValue">The value from the entity property (always English)</param>
        /// <param name="enabledLanguages">List of enabled languages</param>
        public static async Task LoadTranslationsAsync(
            MultilingualField field,
            DbContext db,
            string resourceKey,
            string key,
            string primaryLanguage,
            string? entityPrimaryValue,
            List<string> enabledLanguages)
        {
            field.Clear();

            // Load translations from LocalizationStrings table
            var translations = await db.Set<LocalizationString>()
                .Where(s => s.ResourceKey == resourceKey && s.Key == key)
                .Include(s => s.LocalizationCulture)
                .ToListAsync();

            // Determine where English value is stored
            if (primaryLanguage.StartsWith("en"))
            {
                // Primary is English, so entity property contains English
                field.PrimaryValue = entityPrimaryValue ?? string.Empty;
            }
            else
            {
                // Primary is not English, so get primary language value from translations
                var primaryTranslation = translations
                    .FirstOrDefault(t => t.LocalizationCulture?.Culture == primaryLanguage);
                field.PrimaryValue = primaryTranslation?.DefaultText ?? entityPrimaryValue ?? string.Empty;
            }

            // Load all non-primary language translations
            foreach (var trans in translations)
            {
                var culture = trans.LocalizationCulture?.Culture;
                if (string.IsNullOrWhiteSpace(culture) || culture == primaryLanguage)
                {
                    continue; // Skip primary language - it's stored in PrimaryValue
                }

                // Only load translations for enabled languages
                if (!enabledLanguages.Contains(culture))
                {
                    continue;
                }

                field.Translations[culture] = trans.DefaultText ?? string.Empty;
            }

            // If primary language is not English, put English value (from entity) into Translations dictionary
            if (!primaryLanguage.StartsWith("en"))
            {
                var englishCulture = enabledLanguages.FirstOrDefault(l => l.StartsWith("en")) ?? "en-US";
                if (!field.Translations.ContainsKey(englishCulture) && !string.IsNullOrWhiteSpace(entityPrimaryValue))
                {
                    field.Translations[englishCulture] = entityPrimaryValue;
                }
            }
        }

        /// <summary>
        /// Saves translations from a MultilingualField to the database.
        /// </summary>
        /// <param name="field">The MultilingualField containing values to save</param>
        /// <param name="db">The database context</param>
        /// <param name="resourceKey">The resource key (e.g., "ShareProductCategory.123")</param>
        /// <param name="key">The field key (e.g., "CategoryDisplayName")</param>
        /// <param name="primaryLanguage">The primary language code</param>
        /// <returns>The English value to save to the entity property</returns>
        public static async Task<string> SaveTranslationsAsync(
            MultilingualField field,
            DbContext db,
            string resourceKey,
            string key,
            string primaryLanguage)
        {
            // Get all cultures from database
            var cultures = await db.Set<LocalizationCulture>().ToListAsync();
            var cultureMap = cultures.ToDictionary(c => c.Culture, c => c.Id);

            // Determine English value (entity property always stores English)
            string englishValue;
            if (primaryLanguage.StartsWith("en"))
            {
                // Primary is English, so PrimaryValue is English
                englishValue = field.PrimaryValue;
            }
            else
            {
                // Primary is not English, so get English from translations dictionary
                var englishCulture = field.Translations.Keys.FirstOrDefault(k => k.StartsWith("en")) ?? "en-US";
                englishValue = field.Translations.TryGetValue(englishCulture, out var engValue) && !string.IsNullOrWhiteSpace(engValue)
                    ? engValue
                    : field.PrimaryValue; // Fallback to primary value if English not found
            }

            // Save non-primary language translations
            foreach (var translation in field.Translations)
            {
                // Skip primary language - it's saved separately below
                if (translation.Key == primaryLanguage)
                {
                    continue;
                }

                if (!cultureMap.TryGetValue(translation.Key, out var cultureId))
                {
                    continue; // Skip if culture doesn't exist
                }

                var existing = await db.Set<LocalizationString>()
                    .FirstOrDefaultAsync(s => EF.Property<int>(s, "LocalizationCultureId") == cultureId
                                           && s.ResourceKey == resourceKey
                                           && s.Key == key);

                if (existing != null)
                {
                    existing.UpdateDefault(translation.Value ?? string.Empty);
                }
                else
                {
                    var newString = LocalizationString.Create(
                        localizationCultureId: cultureId,
                        resourceKey: resourceKey,
                        key: key,
                        defaultText: translation.Value ?? string.Empty
                    );
                    db.Set<LocalizationString>().Add(newString);
                }
            }

            // Save primary language translation if primary is not English
            if (!primaryLanguage.StartsWith("en"))
            {
                if (cultureMap.TryGetValue(primaryLanguage, out var primaryCultureId))
                {
                    var existing = await db.Set<LocalizationString>()
                        .FirstOrDefaultAsync(s => EF.Property<int>(s, "LocalizationCultureId") == primaryCultureId
                                               && s.ResourceKey == resourceKey
                                               && s.Key == key);

                    if (existing != null)
                    {
                        existing.UpdateDefault(field.PrimaryValue ?? string.Empty);
                    }
                    else
                    {
                        var newString = LocalizationString.Create(
                            localizationCultureId: primaryCultureId,
                            resourceKey: resourceKey,
                            key: key,
                            defaultText: field.PrimaryValue ?? string.Empty
                        );
                        db.Set<LocalizationString>().Add(newString);
                    }
                }
            }

            return englishValue;
        }

        /// <summary>
        /// Updates the translation cache after saving.
        /// </summary>
        public static void UpdateCache(
            MultilingualField field,
            string resourceKey,
            string key,
            string primaryLanguage)
        {
            // Update cache for all translations (excluding primary language)
            foreach (var translation in field.Translations)
            {
                // Skip primary language - it's cached separately below
                if (translation.Key == primaryLanguage)
                {
                    continue;
                }
                TranslationHelper.UpdateCacheEntry(translation.Key, resourceKey, key, translation.Value ?? string.Empty);
            }

            // Update cache for primary language if not English
            if (!primaryLanguage.StartsWith("en"))
            {
                TranslationHelper.UpdateCacheEntry(primaryLanguage, resourceKey, key, field.PrimaryValue ?? string.Empty);
            }
        }
    }
}