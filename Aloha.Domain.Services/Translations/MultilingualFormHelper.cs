namespace Aloha.Domain.Services.Translations
{
    /// <summary>
    /// Helper methods for multilingual forms to reduce code duplication.
    /// </summary>
    public static class MultilingualFormHelper
    {
        /// <summary>
        /// Checks if any of the provided MultilingualFields have English text available for translation.
        /// </summary>
        public static bool HasEnglishText(List<string> enabledLanguages, params MultilingualField[] fields)
        {
            foreach (var field in fields)
            {
                var englishValue = field.GetEnglish(enabledLanguages);
                if (!string.IsNullOrWhiteSpace(englishValue))
                {
                    return true;
                }
            }
            return false;
        }

        /// <summary>
        /// Gets a list of field labels that have existing text for the specified culture.
        /// </summary>
        public static List<string> GetFieldsWithExistingText(
            string culture, 
            string primaryLanguage, 
            Dictionary<string, MultilingualField> fieldMap)
        {
            var fields = new List<string>();
            foreach (var kvp in fieldMap)
            {
                if (kvp.Value.HasValueForCulture(culture, primaryLanguage))
                {
                    fields.Add(kvp.Key);
                }
            }
            return fields;
        }

        /// <summary>
        /// Translates all provided fields to a single target culture.
        /// </summary>
        public static async Task<List<string>> BulkTranslateToCultureAsync(
            ITranslationHelper translationHelper,
            string targetCulture,
            string primaryLanguage,
            List<string> enabledLanguages,
            Dictionary<string, MultilingualField> fieldMap)
        {
            var errors = new List<string>();
            
            foreach (var kvp in fieldMap)
            {
                var fieldLabel = kvp.Key;
                var field = kvp.Value;
                
                var englishValue = field.GetEnglish(enabledLanguages);
                if (string.IsNullOrWhiteSpace(englishValue))
                {
                    continue;
                }

                try
                {
                    var translated = await translationHelper.TranslateAsync(englishValue, targetCulture);
                    if (translated != null)
                    {
                        field.Set(targetCulture, translated, primaryLanguage);
                    }
                    else
                    {
                        errors.Add($"{fieldLabel}: Translation failed (no result returned)");
                    }
                }
                catch (Exception ex)
                {
                    errors.Add($"{fieldLabel}: {ex.Message}");
                }
            }

            return errors;
        }

        /// <summary>
        /// Translates all provided fields to all available languages.
        /// </summary>
        public static async Task<List<string>> BulkTranslateToAllLanguagesAsync(
            ITranslationHelper translationHelper,
            ILanguageConfigurationService languageConfigService,
            string primaryLanguage,
            List<string> enabledLanguages,
            Dictionary<string, MultilingualField> fieldMap)
        {
            var errors = new List<string>();
            var allAvailableLanguages = await languageConfigService.GetEnabledLanguagesAsync();
            var targetLanguages = allAvailableLanguages.Where(l => l != primaryLanguage).ToList();

            foreach (var kvp in fieldMap)
            {
                var fieldLabel = kvp.Key;
                var field = kvp.Value;
                
                var englishValue = field.GetEnglish(enabledLanguages);
                if (string.IsNullOrWhiteSpace(englishValue))
                {
                    continue;
                }

                foreach (var lang in targetLanguages)
                {
                    try
                    {
                        var translated = await translationHelper.TranslateAsync(englishValue, lang);
                        if (translated != null)
                        {
                            field.Set(lang, translated, primaryLanguage);
                        }
                        else
                        {
                            errors.Add($"{fieldLabel} ({System.Globalization.CultureInfo.GetCultureInfo(lang).DisplayName}): Translation failed");
                        }
                    }
                    catch (Exception ex)
                    {
                        errors.Add($"{fieldLabel} ({System.Globalization.CultureInfo.GetCultureInfo(lang).DisplayName}): {ex.Message}");
                    }
                }
            }

            return errors;
        }

        /// <summary>
        /// Handles translation errors and sets them on the bulk translate button if provided.
        /// </summary>
        public static void HandleTranslationErrors(
            List<string> errors,
            ITranslationHelper translationHelper,
            object? bulkTranslateButton)
        {
            if (errors.Any())
            {
                var isApiConfigured = translationHelper.IsTranslationApiConfigured();
                var errorMessage = isApiConfigured 
                    ? $"Some translations failed: {string.Join("; ", errors)}. Please check your API configuration."
                    : "Translation API is not configured. Please configure Azure Translator or Google Translate API keys in appsettings.json.";
                
                // Use reflection to call SetError if the button has that method
                var setErrorMethod = bulkTranslateButton?.GetType().GetMethod("SetError", new[] { typeof(string) });
                setErrorMethod?.Invoke(bulkTranslateButton, new object[] { errorMessage });
            }
        }
    }
}

