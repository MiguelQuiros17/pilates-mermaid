# How to Wipe Spanish Translations from Database

If you need to start fresh with Spanish translations, you can delete all existing Spanish (es-CR) entries from the database.

## Option 1: Using SQL (Recommended)

Run the SQL script `WipeSpanishTranslations.sql` in your database management tool:

```sql
DELETE FROM LocalizationStrings 
WHERE LocalizationCultureId = (SELECT Id FROM LocalizationCultures WHERE Culture = 'es-CR');
```

## Option 2: Using the Programmatic Method

The `AutoTranslationService` now has a `WipeSpanishTranslationsAsync()` method. You can call it:

1. **From a controller endpoint** (temporary):
   ```csharp
   [HttpPost("/admin/wipe-spanish-translations")]
   public async Task<IActionResult> WipeSpanishTranslations()
   {
       var service = HttpContext.RequestServices.GetRequiredService<IAutoTranslationService>();
       var count = await service.WipeSpanishTranslationsAsync();
       return Ok($"Deleted {count} Spanish translation entries");
   }
   ```

2. **Or modify `AutoTranslationBackgroundService.cs`** to call it once:
   ```csharp
   // Add this temporarily in ExecuteAsync method
   await autoTranslationService.WipeSpanishTranslationsAsync(stoppingToken);
   ```

## After Wiping

1. Restart the application
2. The `AutoTranslationService` will automatically:
   - Detect that Spanish translations are missing
   - Create new entries from the JSON file (if it exists)
   - Or create blank entries ready for translation

## Important Notes

- This only deletes Spanish translations, not the Spanish culture itself
- English translations are not affected
- The JSON and text files in `Aloha.Domain.Services/Translations/` are not deleted
- After wiping, restart the app to regenerate database entries from the JSON file

