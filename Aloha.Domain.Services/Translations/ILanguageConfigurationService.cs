using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Aloha.Domain.Services.Translations
{
    /// <summary>
    /// Service for managing language configuration from SystemFeatures
    /// </summary>
    public interface ILanguageConfigurationService
    {
        /// <summary>
        /// Gets the list of enabled language codes (e.g., ["en-US", "es-CR"])
        /// </summary>
        Task<List<string>> GetEnabledLanguagesAsync(CancellationToken cancellationToken = default);
        
        /// <summary>
        /// Gets the primary language code (e.g., "en-US")
        /// </summary>
        Task<string> GetPrimaryLanguageAsync(CancellationToken cancellationToken = default);
        
        /// <summary>
        /// Checks if multiple languages are enabled
        /// </summary>
        Task<bool> IsMultiLanguageEnabledAsync(CancellationToken cancellationToken = default);
        
        /// <summary>
        /// Checks if a specific language is enabled
        /// </summary>
        Task<bool> IsLanguageEnabledAsync(string languageCode, CancellationToken cancellationToken = default);
        
        /// <summary>
        /// Gets the display name for a language code in the primary language
        /// </summary>
        Task<string> GetLanguageDisplayNameAsync(string languageCode, CancellationToken cancellationToken = default);
    }
}

