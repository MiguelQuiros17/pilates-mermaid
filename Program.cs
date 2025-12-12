using Aloha.Admin.Web.Components;
using Aloha.Admin.Web.Extensions;
using Aloha.Admin.Web.HostedServices;
using Aloha.Admin.Web.Identity.Account;
using Aloha.Domain.Identity.AdminUsers;
using Aloha.Domain.Services;
using Aloha.Infrastructure;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Localization;
using Microsoft.EntityFrameworkCore;
using Serilog;
using System.Net;

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
        options.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(ip, size));
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
    .SetApplicationName("Aloha.Admin")
    .PersistKeysToDbContext<AlohaDb>();

builder.Services.AddBlazorBootstrap();

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents()
    .AddHubOptions(options =>
    {
        //Needed for editing terms and conditions. Default is 32 KB
        options.MaximumReceiveMessageSize = 512 * 1024;
    });

builder.Services.AddHttpClient();
builder.Services.AddHttpContextAccessor();
builder.Services.AddCascadingAuthenticationState();
builder.Services.AddScoped<IdentityUserAccessor>();
builder.Services.AddScoped<IdentityRedirectManager>();
builder.Services.AddScoped<AuthenticationStateProvider, IdentityRevalidatingAuthenticationStateProvider>();
builder.Services.AddCoreDomainServices(coreBackendUrl);
builder.Services.AddAdminDomainServices();

// Register CookieForwardingHandler for HttpClient message handler
builder.Services.AddScoped<Aloha.Admin.Web.Utilities.CookieForwardingHandler>();

// Configure ThemeEditorService HttpClient with cookie forwarding (must be after AddAdminDomainServices)
// Use a named client to avoid conflicts with other HttpClient registrations
builder.Services.AddHttpClient("ThemeEditor", client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
})
.AddHttpMessageHandler<Aloha.Admin.Web.Utilities.CookieForwardingHandler>();

builder.Services.AddDbContextFactory<AlohaDb>(options =>
    options.UseSqlServer(connectionString));

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultScheme = IdentityConstants.ApplicationScheme;
        options.DefaultSignInScheme = IdentityConstants.ExternalScheme;
    })
    .AddIdentityCookies();

builder.Services
    .AddIdentityCore<AdminUser>(options => options.SignIn.RequireConfirmedAccount = true)
    .AddRoles<AdminRole>()
    .AddEntityFrameworkStores<AlohaDb>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

builder.Services.AddScoped<IEmailSender<AdminUser>, IdentityEmailSender>();

//if (builder.Environment.IsProduction())
{
    builder.Services.AddHostedService<MaintenanceService>();
}

builder.Services.AddDbContextFactory<AlohaDb>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddLocalization();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
}

app.UseForwardedHeaders();

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

app.UseStaticFiles();
app.UseAntiforgery();
app.UseCustomSerilogRequestLoggingGeneric();

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

// Add additional endpoints required by the Identity /Account Razor components.
app.MapAdditionalIdentityEndpoints();

// Setup seed data for roles
using (var scope = app.Services.CreateScope())
{
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<AdminRole>>();

    var roles = Enum.GetNames<RoleName>();

    foreach (var role in roles)
    {
        var isRolePresent = await roleManager.RoleExistsAsync(role);

        if (!isRolePresent)
        {
            await roleManager.CreateAsync(AdminRole.Create(role));
        }
    }
}

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