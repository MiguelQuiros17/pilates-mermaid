using Aloha.Customer.Web.Components;
using Aloha.Customer.Web.Extensions;
using Aloha.Customer.Web.HostedServices;
using Aloha.Customer.Web.Services;
using Aloha.Domain.Services;
using Aloha.Domain.Services.Localization;
using Aloha.Infrastructure;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Localization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using Serilog;
using System.Net;
using System.Text.Json.Serialization;
using System.Security.Claims;
using Aloha.Domain.Applicants.ApplicantUsers;
using IPNetwork = Microsoft.AspNetCore.HttpOverrides.IPNetwork;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("AlohaDb") ??
    throw new InvalidOperationException("Connection string 'AlohaDb' not found.");

var coreBackendUrl = builder.Configuration["CoreServiceConfig:BaseUrl"] ??
    throw new InvalidOperationException("CoreServiceConfig 'BaseUrl' not found.");

var forwardHeaderProxies = builder.Configuration.GetSection("ForwardHeaders:Proxies").Get<string[]>() ??
    throw new InvalidOperationException("ForwardHeaders:Proxies not found.");

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .CreateLogger();

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedHost |
        ForwardedHeaders.XForwardedProto;

    foreach (var proxy in forwardHeaderProxies)
    {
        var ip = IPAddress.Parse(proxy.Split('/')[0]);
        var size = int.Parse(proxy.Split('/')[1]);
        options.KnownNetworks.Add(new IPNetwork(ip, size));
    }
});

builder.Services.AddSerilog();
builder.Logging.Configure(options =>
{
    options.ActivityTrackingOptions = ActivityTrackingOptions.SpanId
                                    | ActivityTrackingOptions.TraceId
                                    | ActivityTrackingOptions.ParentId
                                    | ActivityTrackingOptions.Baggage
                                    | ActivityTrackingOptions.Tags;
});

builder.Services.AddDataProtection()
    .SetApplicationName("Aloha.Customer")
    .PersistKeysToDbContext<AlohaDb>();

builder.Services.AddBlazorBootstrap();

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

builder.Services.AddDbContextFactory<AlohaDb>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
.AddCookie(config =>
{
    config.LoginPath = "/";
    config.Cookie.Name = "Aloha.Mahalo.Customer";
    config.Cookie.IsEssential = true;
    config.ExpireTimeSpan = TimeSpan.FromMinutes(40);

    config.Events = new CookieAuthenticationEvents
    {
        OnSignedIn = async context =>
        {
            try
            {
                var principal = context.Principal;
                if (principal == null) return;

                var idClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var emailClaim = principal.FindFirst(ClaimTypes.Email)?.Value
                                 ?? principal.Identity?.Name;

                if (string.IsNullOrEmpty(idClaim) && string.IsNullOrEmpty(emailClaim))
                    return;

                using var scope = context.HttpContext.RequestServices.CreateScope();
                var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<AlohaDb>>();
                await using var db = await dbFactory.CreateDbContextAsync();

                ApplicantUser? user = null;

                if (int.TryParse(idClaim, out var idNumeric))
                {
                    user = await db.ApplicantUsers
                        .FirstOrDefaultAsync(u => u.Id == idNumeric);
                }

                if (user == null && !string.IsNullOrEmpty(emailClaim))
                {
                    user = await db.ApplicantUsers
                        .FirstOrDefaultAsync(u => u.EmailAddress == emailClaim);
                }

                if (user != null)
                {
                    user.NewSignIn();
                    await db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error running OnSignedIn handler for customer cookie.");
            }
        }
    };
});

builder.Services.AddLocalization();
builder.Services.AddSingleton<IStringLocalizerFactory, DbStringLocalizerFactory>();

//Use the json localizer for testing.
//This replaces the above localizer
// NOTE: Commented out to use database in development so Spanish translations work
//if (builder.Environment.IsDevelopment())
//{
//    builder.Services.AddSingleton<IStringLocalizerFactory, JsonStringLocalizerFactory>();
//}

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddHttpClient();
builder.Services.AddHttpContextAccessor();
builder.Services.AddAuthorization();
builder.Services.AddCascadingAuthenticationState();

/*
 * Only run these jobs in production.
 *
 * TODO: These will probably have to
 * move to the backend with a proper
 * scheduler. IIS shuts down after
 * some amount of inactivity so the
 * jobs are not guaranteed to run
 * continuously.
 *
 * */
if (builder.Environment.IsProduction())
{
    builder.Services.AddHostedService<EmailReminderBackgroundService>();
    builder.Services.AddHostedService<AutoCancelAbandonedApplicationsService>();
    builder.Services.AddHostedService<ApplicationDecisionSyncService>();
}

builder.Services.AddHostedService<DatabaseMigratorBackgroundService>();
builder.Services.AddHostedService<DefaultLanguageImportService>();
builder.Services.AddScoped<Aloha.Domain.Services.Translations.IAutoTranslationService, Aloha.Domain.Services.Translations.AutoTranslationService>();
builder.Services.AddScoped<Aloha.Domain.Services.Translations.ITranslationHelper, Aloha.Domain.Services.Translations.TranslationHelper>();
builder.Services.AddHostedService<AutoTranslationBackgroundService>();

//Note: Very important this stays Scoped. Scoped services are per Signal R connection, per user
builder.Services.AddScoped<IApplicationStateProvider, ApplicationStateProvider>();
builder.Services.AddScoped<IAppVisualStateProvider, AppVisualStateProvider>();
builder.Services.AddScoped<IApplicationStepCompletionManager, ApplicationStepCompletionManager>();
builder.Services.AddScoped<IQuestionnaireService, QuestionnaireService>();
builder.Services.AddScoped<IFieldConfigurationService, FieldConfigurationService>();
builder.Services.AddScoped<ISmartyService, SmartyService>();
builder.Services.AddCustomerDomainServices();
builder.Services.AddCoreDomainServices(coreBackendUrl);
builder.Services.AddScoped<FileUploadState>();
builder.Services.AddScoped<ImageUploadService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
}

var supportedCultures = new[] { "en-US", "en-GB", "es-CR" };

var localizationOptions = new RequestLocalizationOptions()
    .SetDefaultCulture(supportedCultures[0])
    .AddSupportedCultures(supportedCultures)
    .AddSupportedUICultures(supportedCultures);

// Ensure cookie provider is used for culture selection
localizationOptions.RequestCultureProviders.Clear();
localizationOptions.RequestCultureProviders.Add(new CookieRequestCultureProvider
{
    CookieName = CookieRequestCultureProvider.DefaultCookieName
});
localizationOptions.RequestCultureProviders.Add(new QueryStringRequestCultureProvider());
localizationOptions.RequestCultureProviders.Add(new AcceptLanguageHeaderRequestCultureProvider());

app.UseRequestLocalization(localizationOptions);

app.UseForwardedHeaders();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.UseAntiforgery();

app.UseCustomSerilogRequestLoggingGeneric();

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.MapBrandingImageEndpoints();
app.MapStylesheetEndpoints();
app.MapImageHandlingEndpoints();
app.MapCardImageEndpoints();
app.MapControllers();

try
{
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.Information("Shut down complete");
    await Log.CloseAndFlushAsync();
}