using Aloha.Domain.Vendors.Plaid;
using Going.Plaid.IdentityVerification;

namespace Aloha.Domain.Services.Plaid.IdentityVerification;

public interface IPlaidIdentityService
{
    Task<IdentityVerificationCreateResponse> CreateIdentityRequestAsync(
        PlaidSettings settings,
        IdentityVerificationCreateRequest request,
        CancellationToken cancellationToken);

    Task<IdentityVerificationGetResponse> GetIdentityVerificationAsync(
        PlaidSettings settings,
        IdentityVerificationGetRequest request,
        CancellationToken cancellationToken);
}







