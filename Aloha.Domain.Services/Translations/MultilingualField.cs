namespace Aloha.Domain.Services.Translations
{
    /// <summary>
    /// A wrapper class for multilingual field values that reduces code duplication
    /// across forms. Manages both the primary language value and translations dictionary.
    /// </summary>
    public class MultilingualField
    {
        private string _primaryValue = string.Empty;
        private readonly Dictionary<string, string> _translations = new();

        /// <summary>
        /// Gets or sets the primary language value (typically English).
        /// This is the value stored in the entity property.
        /// </summary>
        public string PrimaryValue
        {
            get => _primaryValue;
            set => _primaryValue = value ?? string.Empty;
        }

        /// <summary>
        /// Gets the translations dictionary for non-primary languages.
        /// Key is language code (e.g., "es-CR"), value is translated text.
        /// </summary>
        public Dictionary<string, string> Translations => _translations;

        /// <summary>
        /// Sets a value for a specific culture.
        /// If the culture is the primary language, sets PrimaryValue.
        /// Otherwise, adds/updates the Translations dictionary.
        /// </summary>
        public void Set(string culture, string value, string primaryLanguage)
        {
            if (culture == primaryLanguage)
            {
                PrimaryValue = value ?? string.Empty;
            }
            else
            {
                if (string.IsNullOrWhiteSpace(value))
                {
                    _translations.Remove(culture);
                }
                else
                {
                    _translations[culture] = value;
                }
            }
        }

        /// <summary>
        /// Gets the value for a specific culture.
        /// If the culture is the primary language, returns PrimaryValue.
        /// Otherwise, returns the value from Translations dictionary, or empty string if not found.
        /// </summary>
        public string Get(string culture, string primaryLanguage)
        {
            if (culture == primaryLanguage)
            {
                return PrimaryValue;
            }
            return _translations.TryGetValue(culture, out var value) ? value : string.Empty;
        }

        /// <summary>
        /// Gets the English value, checking both PrimaryValue and Translations dictionary.
        /// </summary>
        public string GetEnglish(List<string> availableLanguages)
        {
            // First check if primary is English
            if (!string.IsNullOrWhiteSpace(PrimaryValue))
            {
                return PrimaryValue;
            }

            // Otherwise, look for English in translations
            var englishCulture = availableLanguages.FirstOrDefault(l => l.StartsWith("en")) ?? "en-US";
            return _translations.TryGetValue(englishCulture, out var value) ? value : string.Empty;
        }

        /// <summary>
        /// Clears all values including primary value and translations.
        /// </summary>
        public void Clear()
        {
            _primaryValue = string.Empty;
            _translations.Clear();
        }

        /// <summary>
        /// Checks if the field has any value (primary or translations).
        /// </summary>
        public bool HasValue()
        {
            if (!string.IsNullOrWhiteSpace(_primaryValue))
            {
                return true;
            }
            return _translations.Values.Any(v => !string.IsNullOrWhiteSpace(v));
        }

        /// <summary>
        /// Checks if the field has a value for a specific culture.
        /// </summary>
        public bool HasValueForCulture(string culture, string primaryLanguage)
        {
            if (culture == primaryLanguage)
            {
                return !string.IsNullOrWhiteSpace(_primaryValue);
            }
            return _translations.TryGetValue(culture, out var value) && !string.IsNullOrWhiteSpace(value);
        }
    }
}