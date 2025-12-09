# Automatic Translation Setup

This service automatically detects missing Spanish (es-CR) translations and fills them in using a translation API.

## Translation Providers

### Azure Translator (Recommended - Best Free Tier)
- **Free Tier**: 2 million characters/month
- **Pricing**: Free for first 2M chars, then $10 per 1M characters
- **Best for**: Small occasional additions (you'll likely never exceed the free tier)

### Google Cloud Translation
- **Free Tier**: 500,000 characters/month
- **Pricing**: Free for first 500K chars, then $20 per 1M characters
- **Best for**: If you prefer Google services

## Setup Instructions

### Option 1: Azure Translator (Recommended)

1. **Create Azure Account** (if you don't have one):
   - Go to https://azure.microsoft.com/free/
   - Sign up for free account (includes $200 credit)

2. **Create Translator Resource**:
   - Go to Azure Portal → Create Resource
   - Search for "Translator"
   - Select "Translator" (Text Translation API)
   - Create the resource
   - Note your **API Key** and **Region** (e.g., "eastus", "westus2")

3. **Configure appsettings.json**:
   ```json
   {
     "Translation": {
       "Provider": "Azure",
       "Azure": {
         "ApiKey": "YOUR_AZURE_API_KEY_HERE",
         "Region": "eastus",
         "Endpoint": "https://api.cognitive.microsofttranslator.com"
       }
     }
   }
   ```

### Option 2: Google Cloud Translation

1. **Create Google Cloud Account**:
   - Go to https://cloud.google.com/
   - Sign up (includes $300 free credit)

2. **Enable Translation API**:
   - Go to Google Cloud Console
   - Enable "Cloud Translation API"
   - Create API Key in "APIs & Services" → "Credentials"

3. **Configure appsettings.json**:
   ```json
   {
     "Translation": {
       "Provider": "Google",
       "Google": {
         "ApiKey": "YOUR_GOOGLE_API_KEY_HERE"
       }
     }
   }
   ```

## How It Works

1. **On Application Start**: The `AutoTranslationBackgroundService` runs after `DefaultLanguageImportService` completes
2. **Detection**: Compares all English (en-US) strings with Spanish (es-CR) strings
3. **Translation**: For each missing Spanish string, calls the translation API
4. **Storage**: Saves translated strings to the database
5. **Logging**: Logs all translations for review

## Usage

The service runs automatically on application startup. No manual intervention needed.

To manually trigger translation (e.g., from admin panel):
```csharp
var translationService = serviceProvider.GetRequiredService<IAutoTranslationService>();
var count = await translationService.FillMissingTranslationsAsync();
```

## Cost Estimation

For your use case (few strings per day):
- **Azure**: Free (2M chars/month = ~66,000 words/month)
- **Google**: Free (500K chars/month = ~83,000 words/month)

Even with 100 new strings per day (average 20 chars each = 2,000 chars/day), you'd use:
- ~60,000 chars/month (well within free tiers)

## Notes

- Translations are saved to the database and can be edited by admins later
- The service only translates missing strings, not existing ones
- Rate limiting: 100ms delay between translations to avoid API limits
- Errors are logged but don't stop the process

## Troubleshooting

**"API key not configured" warning**:
- Check your appsettings.json has the correct configuration
- Ensure the API key is valid and has proper permissions

**"Translation returned empty"**:
- Check API quota/limits
- Verify API key is active
- Check network connectivity

**No translations happening**:
- Check logs for errors
- Verify database has English strings
- Ensure Spanish culture (es-CR) is in supported cultures

