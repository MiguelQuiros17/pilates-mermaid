# Quick Start: Auto-Translation Setup

## 1. Update Database Model Reference

The `AutoTranslationService.cs` uses `LocalizationString` model. You may need to adjust:

1. **Model Name**: If your model is named differently (e.g., `LocalizationEntry`, `TranslationString`)
2. **Property Names**: Ensure these properties exist:
   - `Key` (string) - The localization key
   - `Culture` (string) - The culture code (e.g., "en-US", "es-CR")
   - `Value` (string) - The translated text
   - `ResourceName` (string) - The resource name (e.g., "Index")

3. **DbContext**: If your `AlohaDb` has a specific `DbSet<YourModel>`, update the service to use that instead of `db.Set<LocalizationString>()`

## 2. Register Services (Already Done)

The services are already registered in `Program.cs`:
- `IAutoTranslationService` (scoped)
- `AutoTranslationBackgroundService` (hosted service)

## 3. Configure Translation API

Add to your `appsettings.json`:

### For Azure Translator (Recommended):
```json
{
  "Translation": {
    "Provider": "Azure",
    "Azure": {
      "ApiKey": "YOUR_AZURE_API_KEY",
      "Region": "eastus",
      "Endpoint": "https://api.cognitive.microsofttranslator.com"
    }
  }
}
```

### For Google Translate:
```json
{
  "Translation": {
    "Provider": "Google",
    "Google": {
      "ApiKey": "YOUR_GOOGLE_API_KEY"
    }
  }
}
```

## 4. Get API Keys

### Azure Translator:
1. Go to https://portal.azure.com
2. Create Resource → Search "Translator"
3. Create "Translator" resource
4. Copy API Key and Region from "Keys and Endpoint"

### Google Translate:
1. Go to https://console.cloud.google.com
2. Enable "Cloud Translation API"
3. Create API Key in "APIs & Services" → "Credentials"

## 5. Test

1. Start your application
2. Check logs for: "Starting automatic translation of missing Spanish strings..."
3. The service runs automatically after `DefaultLanguageImportService` completes
4. Check your database for new Spanish translations

## Cost

- **Azure**: Free for 2M characters/month (likely never exceeded)
- **Google**: Free for 500K characters/month (likely never exceeded)

For a few strings per day, you'll stay well within free tiers.

