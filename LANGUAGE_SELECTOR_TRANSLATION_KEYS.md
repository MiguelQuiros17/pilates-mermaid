# Language Selector Translation Keys

The language selector component uses these localization keys. Add them to your English (en-US) localization strings:

## Required Keys

- `language-section-heading` - "Language"
- `language-section-description` - "Choose your preferred language for the application."
- `language-section-preferred-language-label` - "Preferred Language"
- `language-section-preferred-language-caption` - "This will change the language for all text in the application."

## Spanish Translations

When you run the auto-translation service, these keys will be included in the generated JSON file. The Spanish translations should be:

- `language-section-heading` - "Idioma"
- `language-section-description` - "Elija su idioma preferido para la aplicación."
- `language-section-preferred-language-label` - "Idioma Preferido"
- `language-section-preferred-language-caption` - "Esto cambiará el idioma de todo el texto en la aplicación."

## Where to Find the Translation File

The Spanish translation JSON file is automatically created in:

**Location:** `translations/es-CR_translations_YYYYMMDD_HHMMSS.json`

**Full Path:** `[YourApplicationDirectory]/translations/es-CR_translations_[timestamp].json`

For example:
- `C:\YourProject\translations\es-CR_translations_20241215_143022.json`

The file is created when:
1. The translation API is not configured, OR
2. Translation API calls fail

The file contains all English strings that need translation, including the language selector keys above.

## How to Use the Translation File

1. Open the JSON file from the `translations` folder
2. Find the entries for the language selector keys
3. Fill in the `SpanishText` field for each entry
4. Save the file
5. The system will use these translations on the next run, or you can import them manually into the database

