using Aloha.Domain.Services.AdminAudit;
using Aloha.Domain.Services.Application;
using Aloha.Domain.Services.Core.Services;
using Aloha.Domain.Services.Core.Services.CoreService;
using Aloha.Domain.Services.Customer.Services;
using Aloha.Domain.Services.Customer.Services.CountryListService;
using Aloha.Domain.Services.Customer.Services.StateListService;
using Aloha.Domain.Services.DeepLinks;
using Aloha.Domain.Services.DocumentSigning.Docusign;
using Aloha.Domain.Services.DocumentSigning.Kinective;
using Aloha.Domain.Services.Encryption;
using Aloha.Domain.Services.ExternalPayments.Services;
using Aloha.Domain.Services.ExternalPayments.Services.RepayService;
using Aloha.Domain.Services.Localization;
using Aloha.Domain.Services.Messaging.Services;
using Aloha.Domain.Services.Plaid;
using Aloha.Domain.Services.Plaid.Auth;
using Aloha.Domain.Services.Plaid.IdentityVerification;
using Aloha.Domain.Services.Plaid.Item;
using Aloha.Domain.Services.Plaid.Link;
using Aloha.Domain.Services.Plaid.Monitor;
using Aloha.Domain.Services.Plaid.Webhooks;
using Microsoft.Extensions.DependencyInjection;

namespace Aloha.Domain.Services
{
    public static class Extensions
    {
        public static IServiceCollection AddCustomerDomainServices(this IServiceCollection services)
        {
            services.AddScoped<IStateListService, StateListService>();
            services.AddScoped<ICountryListService, CountryListService>();
            services.AddScoped<IMessagingService, MessagingService>();
            services.AddScoped<IPlaidLinkService, PlaidLinkService>();
            services.AddScoped<IPlaidWebhookService, PlaidWebhookService>();
            services.AddScoped<IPlaidIdentityService, PlaidIdentityService>();
            services.AddScoped<IPlaidIdentityDocumentService, PlaidIdentityDocumentService>();
            services.AddScoped<IPlaidMonitorService, PlaidMonitorService>();
            services.AddScoped<IPlaidScreeningManager, PlaidScreeningManager>();
            services.AddScoped<IPlaidAuthService, PlaidAuthService>();
            services.AddScoped<IPlaidItemService, PlaidItemService>();
            services.AddScoped<IPlaidBaseClient, PlaidBaseClient>();
            services.AddScoped<IDocusignClient, DocusignClient>();
            services.AddScoped<IDocusignService, DocusignService>();
            services.AddScoped<IKinectiveClient, KinectiveClient>();
            services.AddScoped<IKinectiveService, KinectiveService>();
            services.AddScoped<IKinectiveWebhookService, KinectiveWebhookService>();
            services.AddScoped<IApplicationCompletionService, ApplicationCompletionService>();
            services.AddScoped<IApplicationAutoApprovalService, ApplicationAutoApprovalService>();
            services.AddScoped<IApplicantNotifierService, ApplicantNotifierService>();
            services.AddScoped<IRepayService, RepayService>();
            services.AddScoped<IApplicationPrefillService, ApplicationPrefillService>();
            services.AddScoped<IDeepLinkService, DeepLinkService>();
            services.AddScoped<IEncryptionService, EncyptionService>();

            return services;
        }

        public static IServiceCollection AddAdminDomainServices(this IServiceCollection services)
        {
            services.AddScoped<IStateListService, StateListService>();
            services.AddScoped<ICountryListService, CountryListService>();
            services.AddScoped<IMessagingService, MessagingService>();
            services.AddScoped<IDocusignClient, DocusignClient>();
            services.AddScoped<IDocusignService, DocusignService>();
            services.AddScoped<IKinectiveClient, KinectiveClient>();
            services.AddScoped<IKinectiveService, KinectiveService>();
            services.AddScoped<IApplicationCompletionService, ApplicationCompletionService>();
            services.AddScoped<IApplicationAutoApprovalService, ApplicationAutoApprovalService>();
            services.AddScoped<IApplicantNotifierService, ApplicantNotifierService>();
            services.AddScoped<IRepayService, RepayService>();
            services.AddScoped<IAdminActivityService, AdminActivityService>();
            services.AddScoped<IDeepLinkService, DeepLinkService>();
            services.AddScoped<IEncryptionService, EncyptionService>();
            services.AddScoped<ILocalizationImportExportService, LocalizationImportExportService>();
            services.AddScoped<Aloha.Domain.Services.Translations.ITranslationHelper, Aloha.Domain.Services.Translations.TranslationHelper>();

            return services;
        }

        public static IServiceCollection AddCoreDomainServices(this IServiceCollection services, string coreServiceUrl)
        {
            services.AddScoped<ICoreService, CoreService>();
            services.AddHttpClient<ICoreService, CoreService>(client => client.BaseAddress = new Uri(coreServiceUrl));

            return services;
        }
    }
}