using Aloha.Domain.ApplicationPersons;
using Aloha.Infrastructure;
using Going.Plaid.IdentityVerification;

namespace Aloha.Domain.Services.Plaid.IdentityVerification;

public interface IPlaidIdentityDocumentService
{
    Task PersistDocumentaryVerificationAsync(
        IdentityVerificationGetResponse validation,
        ApplicationPerson person,
        AlohaDb db,
        CancellationToken cancellationToken);
}