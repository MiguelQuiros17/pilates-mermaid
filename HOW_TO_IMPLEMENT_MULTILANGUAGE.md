# How to Implement Multi-Language Support on Pages

This guide explains how to add multi-language translation support to any edit page in the application, following the pattern established in `ApplicationTypeEditPage.razor` and `QuestionnaireEditPage.razor`.

## Overview

The multi-language system allows users to:
- Edit content in the primary language (typically English or Spanish)
- Translate content to other enabled languages
- Use bulk translation to automatically translate all fields
- Store translations in the database for persistence

## Step-by-Step Implementation

### 1. Add Required Using Statements

Add these using statements at the top of your `.razor` file:

```csharp
@using Aloha.Domain.Services.Translations
@using System.Globalization
@using Aloha.Domain.Localization
@using System.ComponentModel.DataAnnotations
@using Microsoft.EntityFrameworkCore
```

### 2. Inject Required Services

Add these service injections:

```csharp
@inject ILanguageConfigurationService LanguageConfigService
@inject ITranslationHelper TranslationHelper
```

### 3. Add Component Fields

Add these fields to your `@code` block:

```csharp
private EditContext editContext = default!;
private Input input = new();
private string bulkSelectedCulture = "en-US"; // Will be initialized to primary language
private string primaryLanguage = "en-US";
private BulkTranslateButton? bulkTranslateButton;
private List<string> enabledLanguages = new();
private Dictionary<string, string> languageDisplayNames = new();
```

### 4. Create Input Class with Translation Dictionaries

Create an `Input` class with your translatable fields and translation dictionaries:

```csharp
private class Input
{
    [Required]
    [MaxLength(200)]
    public string? FieldName { get; set; }  // Primary language value

    [MaxLength(1000)]
    public string? FieldDescription { get; set; }  // Primary language value

    // Translation dictionaries - key is language code (e.g., "es-CR"), value is translated text
    public Dictionary<string, string> NameTranslations { get; set; } = new();
    public Dictionary<string, string> DescriptionTranslations { get; set; } = new();
    
    // Add other non-translatable fields as needed
}
```

**Important**: 
- The main properties (e.g., `FieldName`, `FieldDescription`) hold the **primary language** value
- The `*Translations` dictionaries hold translations for **non-primary languages only**
- When primary language is English, entity properties contain English values
- When primary language is Spanish, entity properties contain Spanish values (from database translations)

### 5. Initialize EditContext and Load Language Configuration

In `OnInitializedAsync()`:

```csharp
protected override async Task OnInitializedAsync()
{
    editContext = new EditContext(input);
    
    // Load language configuration
    enabledLanguages = await LanguageConfigService.GetEnabledLanguagesAsync();
    primaryLanguage = await LanguageConfigService.GetPrimaryLanguageAsync();
    isMultiLanguageEnabled = await LanguageConfigService.IsMultiLanguageEnabledAsync();
    
    // Load language display names (for dropdowns)
    languageDisplayNames = new Dictionary<string, string>();
    foreach (var lang in enabledLanguages)
    {
        languageDisplayNames[lang] = await LanguageConfigService.GetLanguageDisplayNameAsync(lang);
    }
    
    // Load your entity data
    // ... your existing data loading code ...
    
    // After loading entity, call LoadData() to load translations
    await LoadData();
}
```

In `OnAfterRenderAsync()`:

```csharp
protected override async Task OnAfterRenderAsync(bool firstRender)
{
    if (firstRender)
    {
        primaryLanguage = await LanguageConfigService.GetPrimaryLanguageAsync();
        bulkSelectedCulture = primaryLanguage;
        StateHasChanged();
    }
}
```

### 6. Implement LoadData() Method

This method loads existing translations from the database:

```csharp
private async Task LoadData()
{
    if (yourEntity == null) return;

    await using var db = await dbFactory.CreateDbContextAsync();

    // Build resource key: "{EntityTypeName}.{Id}"
    var resourceKey = $"YourEntityType.{Id}";
    
    // Load existing translations from LocalizationStrings table
    var translations = await db.Set<LocalizationString>()
        .Where(s => s.ResourceKey == resourceKey 
                 && (s.Key == "FieldName" || s.Key == "FieldDescription"))
        .Include(s => s.LocalizationCulture)
        .ToListAsync();
    
    // Load primary language values
    if (primaryLanguage.StartsWith("en"))
    {
        // Primary language is English, so entity properties contain the primary language value
        input.FieldName = yourEntity.FieldName;
        input.FieldDescription = yourEntity.FieldDescription;
    }
    else
    {
        // Primary language is Spanish, so we need to load Spanish from database
        var spanishName = translations
            .FirstOrDefault(t => t.LocalizationCulture?.Culture == primaryLanguage && t.Key == "FieldName");
        input.FieldName = spanishName?.DefaultText ?? yourEntity.FieldName;
        
        var spanishDescription = translations
            .FirstOrDefault(t => t.LocalizationCulture?.Culture == primaryLanguage && t.Key == "FieldDescription");
        input.FieldDescription = spanishDescription?.DefaultText ?? yourEntity.FieldDescription;
    }
    
    // Load all non-primary language translations into the Translations dictionary
    foreach (var trans in translations)
    {
        var culture = trans.LocalizationCulture?.Culture;
        if (string.IsNullOrWhiteSpace(culture) || culture == primaryLanguage)
        {
            continue; // Skip primary language (it's in the property)
        }
        
        if (trans.Key == "FieldName")
        {
            input.NameTranslations[culture] = trans.DefaultText ?? "";
        }
        else if (trans.Key == "FieldDescription")
        {
            input.DescriptionTranslations[culture] = trans.DefaultText ?? "";
        }
    }
    
    // If primary language is Spanish, ensure English translations are loaded into the dictionary
    if (!primaryLanguage.StartsWith("en"))
    {
        var englishName = translations
            .FirstOrDefault(t => t.LocalizationCulture?.Culture.StartsWith("en") == true && t.Key == "FieldName");
        if (englishName != null)
        {
            var englishCulture = enabledLanguages.FirstOrDefault(l => l.StartsWith("en"));
            if (englishCulture != null)
            {
                input.NameTranslations[englishCulture] = englishName.DefaultText ?? "";
            }
        }
        else
        {
            // Fallback to entity property if no English translation exists
            var englishCulture = enabledLanguages.FirstOrDefault(l => l.StartsWith("en"));
            if (englishCulture != null)
            {
                input.NameTranslations[englishCulture] = yourEntity.FieldName;
            }
        }
        
        // Repeat for Description...
    }
}
```

### 7. Add UI Components

Add the multi-language components to your markup:

```html
<EditForm EditContext="editContext">
    <DataAnnotationsValidator />
    <ValidationSummary />
    
    @* Bulk translate button at the top *@
    <BulkTranslateButton @ref="bulkTranslateButton"
                        SelectedCulture="@bulkSelectedCulture"
                        SelectedCultureChanged="@OnBulkCultureChanged"
                        OnBulkTranslate="@OnBulkTranslateAll"
                        OnBulkTranslateAllLanguages="@OnBulkTranslateAllLanguages"
                        GetFieldsWithExistingText="@GetFieldsWithExistingText"
                        HasEnglishTextFunc="@HasEnglishText" />

    @* Multi-language input for each translatable field *@
    <MultiLanguageInput Label="Field Name"
                       FieldId="fieldName"
                       Placeholder="Enter field name"
                       Rows="1"
                       IsDisabled="@isReadOnly"
                       EnglishValue="@input.FieldName"
                       EnglishValueChanged="@((string value) => input.FieldName = value)"
                       Translations="@input.NameTranslations"
                       TranslationsChanged="@((Dictionary<string, string> trans) => input.NameTranslations = trans)"
                       SelectedCultureOverride="@bulkSelectedCulture"
                       SelectedCultureOverrideChanged="@OnBulkCultureChanged" />

    <MultiLanguageInput Label="Field Description"
                       FieldId="fieldDescription"
                       Placeholder="Enter field description"
                       Rows="3"
                       IsDisabled="@isReadOnly"
                       EnglishValue="@input.FieldDescription"
                       EnglishValueChanged="@((string value) => input.FieldDescription = value)"
                       Translations="@input.DescriptionTranslations"
                       TranslationsChanged="@((Dictionary<string, string> trans) => input.DescriptionTranslations = trans)"
                       SelectedCultureOverride="@bulkSelectedCulture"
                       SelectedCultureOverrideChanged="@OnBulkCultureChanged" />
    
    @* Your other form fields here *@
</EditForm>
```

### 8. Implement Helper Methods

Add these helper methods:

```csharp
private async Task OnBulkCultureChanged(string culture)
{
    bulkSelectedCulture = culture;
    StateHasChanged();
}

private bool HasEnglishText()
{
    return !string.IsNullOrWhiteSpace(input.FieldName) ||
           !string.IsNullOrWhiteSpace(input.FieldDescription);
}

private List<string> GetFieldsWithExistingText()
{
    var fields = new List<string>();
    if (input.NameTranslations.TryGetValue(bulkSelectedCulture, out var nameTrans) && !string.IsNullOrWhiteSpace(nameTrans))
    {
        fields.Add("Field Name");
    }
    if (input.DescriptionTranslations.TryGetValue(bulkSelectedCulture, out var descTrans) && !string.IsNullOrWhiteSpace(descTrans))
    {
        fields.Add("Field Description");
    }
    return fields;
}
```

### 9. Implement Bulk Translation Methods

```csharp
private async Task OnBulkTranslateAll()
{
    bulkTranslateButton?.ClearError();
    
    if (string.IsNullOrWhiteSpace(bulkSelectedCulture) || bulkSelectedCulture == primaryLanguage)
    {
        return;
    }

    var errors = new List<string>();

    // Translate each field
    if (!string.IsNullOrWhiteSpace(input.FieldName))
    {
        try
        {
            var translated = await TranslationHelper.TranslateAsync(input.FieldName, bulkSelectedCulture);
            if (translated != null)
            {
                input.NameTranslations[bulkSelectedCulture] = translated;
            }
            else
            {
                errors.Add($"Field Name: Translation failed (no result returned)");
            }
        }
        catch (Exception ex)
        {
            errors.Add($"Field Name: {ex.Message}");
        }
    }

    // Repeat for other fields...

    if (errors.Any())
    {
        var isApiConfigured = TranslationHelper.IsTranslationApiConfigured();
        var errorMessage = isApiConfigured 
            ? $"Some translations failed: {string.Join("; ", errors)}. Please check your API configuration."
            : "Translation API is not configured. Please configure Azure Translator or Google Translate API keys.";
        bulkTranslateButton?.SetError(errorMessage);
    }

    StateHasChanged();
}

private async Task OnBulkTranslateAllLanguages()
{
    bulkTranslateButton?.ClearError();
    
    var availableLanguages = await TranslationHelper.GetAvailableLanguagesAsync();
    var errors = new List<string>();

    // Translate each field to all languages
    if (!string.IsNullOrWhiteSpace(input.FieldName))
    {
        foreach (var lang in availableLanguages)
        {
            if (lang == primaryLanguage) continue; // Skip primary language
            
            try
            {
                var translated = await TranslationHelper.TranslateAsync(input.FieldName, lang);
                if (translated != null)
                {
                    input.NameTranslations[lang] = translated;
                }
                else
                {
                    errors.Add($"Field Name ({CultureInfo.GetCultureInfo(lang).DisplayName}): Translation failed");
                }
            }
            catch (Exception ex)
            {
                errors.Add($"Field Name ({CultureInfo.GetCultureInfo(lang).DisplayName}): {ex.Message}");
            }
        }
    }

    // Repeat for other fields...

    if (errors.Any())
    {
        var isApiConfigured = TranslationHelper.IsTranslationApiConfigured();
        var errorMessage = isApiConfigured 
            ? $"Some translations failed: {string.Join("; ", errors)}. Please check your API configuration."
            : "Translation API is not configured. Please configure Azure Translator or Google Translate API keys.";
        bulkTranslateButton?.SetError(errorMessage);
    }

    StateHasChanged();
}
```

### 10. Implement Save Logic

In your save method (e.g., `UpdateEntity()` or `SubmitForm()`), add translation saving logic:

```csharp
private async Task UpdateEntity(AlohaDb db, int entityId, YourFormInput values)
{
    // ... your existing update logic ...
    
    yourEntity.Update(values.FieldName!, /* other fields */);
    
    // Save translations to LocalizationStrings table
    var resourceKey = $"YourEntityType.{entityId}";
    
    // Get all cultures from database
    var cultures = await db.Set<LocalizationCulture>().ToListAsync();
    var cultureMap = cultures.ToDictionary(c => c.Culture, c => c.Id);
    
    // Save each field's translations
    foreach (var translation in input.NameTranslations)
    {
        if (!cultureMap.TryGetValue(translation.Key, out var cultureId))
        {
            continue; // Skip if culture doesn't exist
        }
        
        var existing = await db.Set<LocalizationString>()
            .FirstOrDefaultAsync(s => EF.Property<int>(s, "LocalizationCultureId") == cultureId 
                                   && s.ResourceKey == resourceKey 
                                   && s.Key == "FieldName");
        
        if (existing != null)
        {
            existing.UpdateDefault(translation.Value ?? "");
        }
        else
        {
            var newString = LocalizationString.Create(
                localizationCultureId: cultureId,
                resourceKey: resourceKey,
                key: "FieldName",
                defaultText: translation.Value ?? ""
            );
            db.Set<LocalizationString>().Add(newString);
        }
    }
    
    // Save primary language value to database if primary is not English
    // (When primary is English, it's saved in the entity property, not in LocalizationStrings)
    if (!primaryLanguage.StartsWith("en"))
    {
        if (cultureMap.TryGetValue(primaryLanguage, out var primaryCultureId))
        {
            var existing = await db.Set<LocalizationString>()
                .FirstOrDefaultAsync(s => EF.Property<int>(s, "LocalizationCultureId") == primaryCultureId 
                                       && s.ResourceKey == resourceKey 
                                       && s.Key == "FieldName");
            
            if (existing != null)
            {
                existing.UpdateDefault(input.FieldName ?? "");
            }
            else
            {
                var newString = LocalizationString.Create(
                    localizationCultureId: primaryCultureId,
                    resourceKey: resourceKey,
                    key: "FieldName",
                    defaultText: input.FieldName ?? ""
                );
                db.Set<LocalizationString>().Add(newString);
            }
        }
    }
    
    // Repeat for other translatable fields (FieldDescription, etc.)
    
    await db.SaveChangesAsync();
}
```

## Key Patterns and Considerations

### Resource Key Format
- Format: `"{EntityTypeName}.{Id}"`
- Examples: `"ProductApplicationType.5"`, `"Questionnaire.12"`
- The entity type name should match the C# class name (without namespace)

### Translation Key Names
- Use descriptive, consistent key names: `"DisplayName"`, `"Description"`, `"Name"`, etc.
- These keys are stored in the `LocalizationString.Key` field
- They should match what you use in `TranslationHelper.GetLocalTextAsync()` when retrieving translations

### Primary Language Handling
- **When primary language is English**: Entity properties contain English values directly
- **When primary language is Spanish**: Entity properties may contain English, but Spanish is loaded from `LocalizationStrings` table
- Always check `primaryLanguage.StartsWith("en")` to determine behavior

### Translation Dictionary Keys
- Keys in `*Translations` dictionaries are language codes (e.g., `"en-US"`, `"es-CR"`)
- **Never include the primary language** in the translation dictionaries
- The primary language value is always in the main property (e.g., `input.FieldName`)

### Loading Translations
1. Load all translations from database for the resource key
2. Determine primary language value (from entity property or database)
3. Load non-primary translations into dictionaries
4. If primary is Spanish, ensure English is in the dictionary for display

### Saving Translations
1. Save all non-primary language translations from dictionaries
2. If primary language is not English, save primary language value to database
3. If primary language is English, the entity property update handles it

### Error Handling
- Always check if translation API is configured before showing errors
- Provide clear error messages to users
- Use `bulkTranslateButton?.SetError()` to display errors prominently

## Example: Complete Field Implementation

For a field called "Title":

1. **Input class**:
```csharp
public string? Title { get; set; }
public Dictionary<string, string> TitleTranslations { get; set; } = new();
```

2. **LoadData()**:
```csharp
if (primaryLanguage.StartsWith("en"))
{
    input.Title = entity.Title;
}
else
{
    var spanishTitle = translations
        .FirstOrDefault(t => t.LocalizationCulture?.Culture == primaryLanguage && t.Key == "Title");
    input.Title = spanishTitle?.DefaultText ?? entity.Title;
}

foreach (var trans in translations)
{
    var culture = trans.LocalizationCulture?.Culture;
    if (string.IsNullOrWhiteSpace(culture) || culture == primaryLanguage) continue;
    
    if (trans.Key == "Title")
    {
        input.TitleTranslations[culture] = trans.DefaultText ?? "";
    }
}
```

3. **UI Component**:
```html
<MultiLanguageInput Label="Title"
                   FieldId="title"
                   Placeholder="Enter title"
                   Rows="1"
                   IsDisabled="@isReadOnly"
                   EnglishValue="@input.Title"
                   EnglishValueChanged="@((string value) => input.Title = value)"
                   Translations="@input.TitleTranslations"
                   TranslationsChanged="@((Dictionary<string, string> trans) => input.TitleTranslations = trans)"
                   SelectedCultureOverride="@bulkSelectedCulture"
                   SelectedCultureOverrideChanged="@OnBulkCultureChanged" />
```

4. **Bulk Translation**:
```csharp
if (!string.IsNullOrWhiteSpace(input.Title))
{
    var translated = await TranslationHelper.TranslateAsync(input.Title, bulkSelectedCulture);
    if (translated != null)
    {
        input.TitleTranslations[bulkSelectedCulture] = translated;
    }
}
```

5. **Save Logic**:
```csharp
foreach (var translation in input.TitleTranslations)
{
    // Save to database with key "Title"
}
if (!primaryLanguage.StartsWith("en"))
{
    // Save primary language Title to database
}
```

## Testing Checklist

- [ ] Primary language (English) values load correctly from entity properties
- [ ] Primary language (Spanish) values load correctly from database
- [ ] Non-primary translations load into dictionaries
- [ ] Switching language dropdown updates input fields
- [ ] Bulk translate single language works
- [ ] Bulk translate all languages works
- [ ] Translations save correctly to database
- [ ] Translations persist after page reload
- [ ] Error messages display when translation API fails
- [ ] Validation works correctly with EditContext

## Common Pitfalls

1. **Including primary language in translation dictionaries**: Don't do this. Primary language is always in the main property.

2. **Wrong resource key format**: Must be `"{EntityTypeName}.{Id}"` exactly.

3. **Forgetting to save primary language when it's Spanish**: If primary is Spanish, you must save it to the database.

4. **Not loading English when primary is Spanish**: Users need to see/edit English even when Spanish is primary.

5. **Missing EditContext**: `MultiLanguageInput` requires `EditContext` from `EditForm`.

6. **Using both Model and EditContext**: `EditForm` requires one or the other, not both.

## Reference Files

- `ApplicationTypeEditPage.razor` - Full implementation example
- `QuestionnaireEditPage.razor` - Full implementation example
- `MultiLanguageInput.razor` - Reusable component
- `BulkTranslateButton.razor` - Language selector and bulk translation UI
- `TranslationHelper.cs` - Translation API service
- `LanguageConfigurationService.cs` - Language configuration service





