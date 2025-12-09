# Language Selector Component for Blazor

This component adds a language dropdown to the settings page that allows users to switch between English and Spanish.

## Files Created

1. **LanguageSelector.razor** - The main Blazor component for language selection
2. **LanguageSelector.razor.cs** - Code-behind file (partial class)
3. **SettingsPage.razor** - Updated settings page with the language selector integrated (includes culture switching logic)
4. **LocalizationSetup.cs** - Instructions for updating Program.cs/Startup.cs

## Setup Instructions

### 1. Add Required Services

Add `IHttpContextAccessor` to your service configuration in `Program.cs` (add this with your other service registrations, around line 150-200):

```csharp
builder.Services.AddHttpContextAccessor();
```

### 2. Update Supported Cultures

In your `Program.cs`, find this line (around line 244):
```csharp
var supportedCultures = new[] { "en-US", "en-GB" };
```

Change it to:
```csharp
var supportedCultures = new[] { "en-US", "en-GB", "es-CR" };
```

That's the only change needed! The rest of your localization setup will automatically work with the new culture.

### 3. Update Your Settings Page

You have two options:

**Option A:** Replace your existing settings page with `SettingsPage.razor` (includes culture switching logic)

**Option B:** Add the `<LanguageSelector />` component to your existing settings page and add the culture switching logic:

```csharp
@using Microsoft.AspNetCore.Localization
@using Microsoft.AspNetCore.Http
@using System.Globalization
@inject IHttpContextAccessor HttpContextAccessor

// In your @code block:
[SupplyParameterFromQuery(Name = "setCulture")]
private string? SetCulture { get; set; }

protected override void OnInitialized()
{
    // ... your existing code ...
    
    // Handle culture switching via query parameter
    if (!string.IsNullOrWhiteSpace(SetCulture))
    {
        if (SetCulture == "en-US" || SetCulture == "es-CR" || SetCulture == "en-GB")
        {
            var httpContext = HttpContextAccessor.HttpContext;
            if (httpContext != null)
            {
                var culture = CultureInfo.CreateSpecificCulture(SetCulture);
                httpContext.Response.Cookies.Append(
                    CookieRequestCultureProvider.DefaultCookieName,
                    CookieRequestCultureProvider.MakeCookieValue(
                        new RequestCulture(culture, culture)));
                
                Nav.NavigateTo("/application/settings", true);
            }
        }
    }
}
```

### 4. Add Localization Keys

Add these localization keys to your JSON files or database for the language selector:

**English (en-US):**
- `language-section-heading`: "Language"
- `language-section-description`: "Choose your preferred language for the application."
- `language-section-preferred-language-label`: "Preferred Language"
- `language-section-preferred-language-caption`: "This will change the language for all text in the application."

**Spanish (es-CR):**
- `language-section-heading`: "Idioma"
- `language-section-description`: "Elija su idioma preferido para la aplicación."
- `language-section-preferred-language-label`: "Idioma Preferido"
- `language-section-preferred-language-caption`: "Esto cambiará el idioma de todo el texto en la aplicación."

### 5. Update Namespace

Update the namespace in `LanguageSelector.razor.cs` to match your project's namespace structure.

## How It Works

1. The component reads the current culture from the request culture feature
2. When a user selects a different language, it sets a cookie using `CookieRequestCultureProvider`
3. The page is then navigated to refresh with the new culture
4. The cookie persists the language preference across page loads

## Testing

You can test the language switching by:
1. Visiting the settings page
2. Selecting a different language from the dropdown
3. The page should refresh and display in the selected language

You can also test via URL parameters:
- `http://localhost:5239/?setCulture=en-US`
- `http://localhost:5239/?setCulture=es-CR`

