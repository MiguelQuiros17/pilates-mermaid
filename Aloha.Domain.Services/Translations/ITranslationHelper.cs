namespace Aloha.Domain.Services.Translations
{
    /// <summary>
    /// Helper service for translating individual strings from English to other languages.
    /// Uses the same translation APIs as AutoTranslationService.
    /// </summary>
    public interface ITranslationHelper
    {
        /// <summary>
        /// Translates text from English (en-US) to the specified target language.
        /// </summary>
        /// <param name="englishText">The English text to translate</param>
        /// <param name="targetLanguageCode">Target language code (e.g., "es-CR")</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Translated text, or null if translation fails or API is not configured</returns>
        Task<string?> TranslateAsync(string englishText, string targetLanguageCode, CancellationToken cancellationToken = default);
        
        /// <summary>
        /// Gets the list of available target languages (excluding English).
        /// </summary>
        /// <returns>List of language codes (e.g., ["es-CR"])</returns>
        Task<List<string>> GetAvailableLanguagesAsync(CancellationToken cancellationToken = default);
        
        /// <summary>
        /// Checks if translation API is configured.
        /// </summary>
        /// <returns>True if API is configured, false otherwise</returns>
        bool IsTranslationApiConfigured();
    }
}

