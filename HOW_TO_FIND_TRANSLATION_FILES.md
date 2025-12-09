# How to Find Translation Files in JetBrains Rider

## Where Translation Files Are Created

Translation files are created in: `[YourApplicationWorkingDirectory]/translations/`

The working directory is typically:
- **Development**: Your project's `bin/Debug/netX.X` or `bin/Release/netX.X` folder
- **Production**: Wherever your application is running from

## How to Find the File in Rider

### Method 1: Check the Logs
After restarting your application, look for these log messages:
```
AutoTranslationService: Current directory: [path]
AutoTranslationService: Translations directory: [full path]
AutoTranslationService: Full file path: [full path]
```

The log will show the exact full path where the file was created.

### Method 2: Search in Rider
1. Press `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac) to open "Search Everywhere"
2. Search for: `es-CR_translations`
3. This will find any translation files that exist

### Method 3: Check Project Structure
1. In Rider, look at the **Solution Explorer** or **Project** view
2. Look for a `translations` folder
3. If it doesn't appear, it might be in the build output directory

### Method 4: Check Build Output Directory
1. Right-click your project → **Properties** (or **Open in Explorer**)
2. Navigate to: `bin/Debug/netX.X/translations/` or `bin/Release/netX.X/translations/`
3. Look for files named: `es-CR_translations_YYYYMMDD_HHMMSS.json`

## Why You Might Not See the File

1. **Service isn't running**: Check logs for "AutoTranslationBackgroundService: Service started"
2. **No missing translations**: If all Spanish translations already exist, no file is created
3. **es-CR culture doesn't exist**: The service requires the es-CR culture to exist in the database first
4. **API is configured and working**: If the API successfully translates everything, no file is created

## Debug Steps

1. **Check if service is running**: Look for logs starting with "AutoTranslationBackgroundService:"
2. **Check if es-CR culture exists**: The service will log "Spanish culture (es-CR) not found" if it doesn't exist
3. **Check for missing translations**: The service will log "Found X missing Spanish translations"
4. **Check API configuration**: If API is configured, it will try to translate automatically

## Force File Creation

To force a translation file to be created:
1. Make sure es-CR culture exists in your database
2. Add a new English string to your JSON localization file
3. Restart the application
4. The service should detect the new string and create a translation file

