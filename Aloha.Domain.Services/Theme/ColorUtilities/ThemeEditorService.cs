using System.Text;
using System.Text.Json;
using Aloha.Domain.Customization;
using Aloha.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Aloha.Domain.Services.Theme.ColorUtilities;

public class ThemeEditorService : IThemeEditorService
{
    private readonly IDbContextFactory<AlohaDb> _dbFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<ThemeEditorService> _logger;

    public ThemeEditorService(IDbContextFactory<AlohaDb> dbFactory, IConfiguration config, ILogger<ThemeEditorService> logger)
    {
        _dbFactory = dbFactory;
        _config = config;
        _logger = logger;
    }

    public async Task<string> FetchActiveBootstrapCssAsync(string webRootPath, string contentRootPath)
    {
        try
        {
            await using var db = await _dbFactory.CreateDbContextAsync();
            var existingFile = await db.CustomStyleSheets
                .FirstOrDefaultAsync(f => f.UseCase == CustomStyleSheetUseCase.BootstrapCompleteOverride);

            if (existingFile?.FileContent is { Length: > 0 })
                return Encoding.UTF8.GetString(existingFile.FileContent);

            var candidates = BuildBootstrapCandidates(webRootPath, contentRootPath);
            return await TryReadStaticFileFromCandidatesAsync(candidates) ?? string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch active Bootstrap CSS");
            return string.Empty;
        }
    }

    public async Task<string> FetchAdditionalCssAsync(string webRootPath, string contentRootPath)
    {
        try
        {
            await using var db = await _dbFactory.CreateDbContextAsync();
            var existingFile = await db.CustomStyleSheets
                .FirstOrDefaultAsync(f => f.UseCase == CustomStyleSheetUseCase.AlohaCssOverride);

            if (existingFile?.FileContent is { Length: > 0 })
                return Encoding.UTF8.GetString(existingFile.FileContent);

            var candidates = BuildAdditionalCandidates(webRootPath, contentRootPath);
            return await TryReadStaticFileFromCandidatesAsync(candidates) ?? string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch additional CSS");
            return string.Empty;
        }
    }

    public async Task SaveStylesheetsAsync(string bootstrapCss, string additionalCss)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var bytesBootstrap = Encoding.UTF8.GetBytes(bootstrapCss ?? string.Empty);

        if (bytesBootstrap.Length > 0)
        {
            var existingBootstrap = await db.CustomStyleSheets
                .FirstOrDefaultAsync(f => f.UseCase == CustomStyleSheetUseCase.BootstrapCompleteOverride);

            if (existingBootstrap is null)
            {
                var newFile = CustomStyleSheet.Create(CustomStyleSheetUseCase.BootstrapCompleteOverride, "text/css", bytesBootstrap);
                await db.AddAsync(newFile);
            }
            else
            {
                existingBootstrap.Update("text/css", bytesBootstrap);
            }
        }

        var bytesAdditional = Encoding.UTF8.GetBytes(additionalCss ?? string.Empty);
        var existingAdditional = await db.CustomStyleSheets
            .FirstOrDefaultAsync(f => f.UseCase == CustomStyleSheetUseCase.AlohaCssOverride);

        if (bytesAdditional.Length > 0)
        {
            if (existingAdditional is null)
            {
                var newAdd = CustomStyleSheet.Create(CustomStyleSheetUseCase.AlohaCssOverride, "text/css", bytesAdditional);
                await db.AddAsync(newAdd);
            }
            else
            {
                existingAdditional.Update("text/css", bytesAdditional);
            }
        }

        await db.SaveChangesAsync();
    }

    public async Task<ThemeEditorSettingsDto?> LoadSettingsFromDbAsync()
    {
        try
        {
            await using var db = await _dbFactory.CreateDbContextAsync();
            var settingsFile = await db.CustomStyleSheets
                .FirstOrDefaultAsync(f => f.UseCase == CustomStyleSheetUseCase.ThemeEditorSettings);

            if (settingsFile?.FileContent is { Length: > 0 })
            {
                var json = Encoding.UTF8.GetString(settingsFile.FileContent);
                return JsonSerializer.Deserialize<ThemeEditorSettingsDto>(json);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load settings from database");
        }
        return null;
    }

    public async Task SaveSettingsToDbAsync(ThemeEditorSettingsDto dto)
    {
        try
        {
            var json = JsonSerializer.Serialize(dto, new JsonSerializerOptions { WriteIndented = false });
            var bytes = Encoding.UTF8.GetBytes(json);

            await using var db = await _dbFactory.CreateDbContextAsync();
            var existing = await db.CustomStyleSheets
                .FirstOrDefaultAsync(f => f.UseCase == CustomStyleSheetUseCase.ThemeEditorSettings);

            if (existing is null)
            {
                var newFile = CustomStyleSheet.Create(CustomStyleSheetUseCase.ThemeEditorSettings, "application/json", bytes);
                await db.AddAsync(newFile);
            }
            else
            {
                existing.Update("application/json", bytes);
            }

            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save settings to database");
        }
    }

    private string[] BuildBootstrapCandidates(string webRootPath, string contentRootPath)
    {
        var webroot = webRootPath ?? string.Empty;
        var contentRoot = contentRootPath ?? string.Empty;
        var candidates = new List<string>
        {
            Path.Combine(webroot, "css", "aloha-bootstrap.min.css"),
            Path.Combine(webroot, "css", "bootstrap.min.css"),
            Path.Combine(webroot, "css", "aloha-bootstrap.css"),
            Path.Combine(webroot, "css", "bootstrap.css")
        };

        var sibling = Path.Combine(contentRoot, "..", "Aloha.Customer.Web", "wwwroot", "css");
        candidates.Add(Path.Combine(sibling, "aloha-bootstrap.min.css"));
        candidates.Add(Path.Combine(sibling, "bootstrap.min.css"));
        candidates.Add(Path.Combine(sibling, "aloha-bootstrap.css"));
        candidates.Add(Path.Combine(sibling, "bootstrap.css"));

        var configured = _config["CustomerWebRoot"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            candidates.Add(Path.Combine(configured, "css", "aloha-bootstrap.min.css"));
            candidates.Add(Path.Combine(configured, "css", "bootstrap.min.css"));
            candidates.Add(Path.Combine(configured, "css", "aloha-bootstrap.css"));
            candidates.Add(Path.Combine(configured, "css", "bootstrap.css"));
        }

        return candidates.ToArray();
    }

    private string[] BuildAdditionalCandidates(string webRootPath, string contentRootPath)
    {
        var webroot = webRootPath ?? string.Empty;
        var contentRoot = contentRootPath ?? string.Empty;
        var candidates = new List<string>
        {
            Path.Combine(webroot, "css", "aloha-additional.css"),
            Path.Combine(webroot, "css", "aloha-css-overrides.css"),
            Path.Combine(webroot, "css", "aloha-additional.min.css"),
            Path.Combine(webroot, "css", "additional.css")
        };

        var sibling = Path.Combine(contentRoot, "..", "Aloha.Customer.Web", "wwwroot", "css");
        candidates.Add(Path.Combine(sibling, "aloha-additional.css"));
        candidates.Add(Path.Combine(sibling, "aloha-css-overrides.css"));
        candidates.Add(Path.Combine(sibling, "aloha-additional.min.css"));
        candidates.Add(Path.Combine(sibling, "additional.css"));

        var configured = _config["CustomerWebRoot"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            candidates.Add(Path.Combine(configured, "css", "aloha-additional.css"));
            candidates.Add(Path.Combine(configured, "css", "aloha-css-overrides.css"));
            candidates.Add(Path.Combine(configured, "css", "aloha-additional.min.css"));
            candidates.Add(Path.Combine(configured, "css", "additional.css"));
        }

        return candidates.ToArray();
    }

    private async Task<string?> TryReadStaticFileFromCandidatesAsync(IEnumerable<string> candidates)
    {
        foreach (var p in candidates)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(p) || !File.Exists(p)) continue;
                var txt = await File.ReadAllTextAsync(p);
                if (!string.IsNullOrWhiteSpace(txt)) return txt;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to read static file candidate: {FilePath}", p);
            }
        }
        return null;
    }
}

