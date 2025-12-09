# Program.cs Changes Required

## Change 1: Add IHttpContextAccessor Service

Add this line in your service configuration section (around line 150-200, with your other service registrations):

```csharp
builder.Services.AddHttpContextAccessor();
```

**Location:** Add it after your other service registrations, for example after:
```csharp
builder.Services.AddHttpClient();
```

## Change 2: Update Supported Cultures

Find this line in your `Program.cs` (around line 244):

```csharp
var supportedCultures = new[] { "en-US", "en-GB" };
```

Change it to:

```csharp
var supportedCultures = new[] { "en-US", "en-GB", "es-CR" };
```

That's it! These are the only two changes needed in Program.cs.

## Summary

1. ✅ Add `builder.Services.AddHttpContextAccessor();` to service registrations
2. ✅ Add `"es-CR"` to the `supportedCultures` array

After making these changes, your application will support Spanish (Costa Rica) as a language option, and the language selector component will work correctly.

