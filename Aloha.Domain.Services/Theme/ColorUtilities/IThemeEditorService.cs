using Aloha.Domain.Customization;

namespace Aloha.Domain.Services.Theme.ColorUtilities;

public interface IThemeEditorService
{
    Task<string> FetchActiveBootstrapCssAsync(string webRootPath, string contentRootPath);
    Task<string> FetchAdditionalCssAsync(string webRootPath, string contentRootPath);
    Task SaveStylesheetsAsync(string bootstrap, string additional);
    Task<ThemeEditorSettingsDto?> LoadSettingsFromDbAsync();
    Task SaveSettingsToDbAsync(ThemeEditorSettingsDto dto);
}


