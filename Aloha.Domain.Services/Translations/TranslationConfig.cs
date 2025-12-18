namespace Aloha.Domain.Services.Translations
{
    /// <summary>
    /// Global configuration for translation features.
    /// </summary>
    public static class TranslationConfig
    {
        /// <summary>
        /// Global flag to enable/disable auto-translation buttons in MultiLanguageInput components.
        /// Set to true to show translation buttons, false to hide them.
        /// </summary>
        public static bool AUTOTRANSLATIONAVAILABLE { get; set; } = true;
    }
}

