using ImageMagick;
using Aloha.Domain.ApplicationImages;
using Aloha.Domain.ApplicationPersons;
using Aloha.Infrastructure;
using Aloha.Domain.Services.Customer.Services;
using Going.Plaid.Entity;
using Going.Plaid.IdentityVerification;
using Microsoft.Extensions.Logging;

namespace Aloha.Domain.Services.Plaid.IdentityVerification;

public class PlaidIdentityDocumentService(
    IHttpClientFactory httpClientFactory,
    ICountryListService countryListService,
    ILogger<PlaidIdentityDocumentService> logger) : IPlaidIdentityDocumentService
{
    public async Task PersistDocumentaryVerificationAsync(
        IdentityVerificationGetResponse validation,
        ApplicationPerson person,
        AlohaDb db,
        CancellationToken cancellationToken)
    {
        var documents = validation.DocumentaryVerification?.Documents;
        if (documents is null || documents.Count == 0)
        {
            logger.LogWarning("Skipping Plaid identification persistence for person {PersonId}: No documents returned from Plaid", person.Id);
            return;
        }

        // Grab latest attempt (in case of retries)
        var document = documents
            .Where(d => d is { Images: not null } && HasFrontImage(d.Images))
            .MaxBy(d => d.Attempt);

        if (document?.Images is null || document.ExtractedData is null)
        {
            logger.LogWarning("Skipping Plaid identification persistence for person {PersonId}: Document images or extracted data missing", person.Id);
            return;
        }

        var extracted = document.ExtractedData;
        var idType = MapDocumentCategoryToIdentificationType(extracted.Category);
        if (idType is null)
        {
            logger.LogWarning("Skipping Plaid identification persistence for person {PersonId}: Unsupported document category {Category}", person.Id, extracted.Category);
            return;
        }

        var existingIdentification = person.Identification;

        var idNumber = !string.IsNullOrWhiteSpace(extracted.IdNumber)
            ? extracted.IdNumber
            : existingIdentification?.IdNumber;
        if (string.IsNullOrWhiteSpace(idNumber))
        {
            logger.LogWarning("Skipping Plaid identification persistence for person {PersonId}: ID number missing (extracted: {ExtractedIdNumber}, existing: {ExistingIdNumber})", person.Id, extracted.IdNumber, existingIdentification?.IdNumber);
            return;
        }

        var locationCode = DetermineLocationCode(idType.Value, extracted, person, existingIdentification);
        if (string.IsNullOrWhiteSpace(locationCode))
        {
            logger.LogWarning("Skipping Plaid identification persistence for person {PersonId}: Issuing location code missing (type: {IdType}, region: {IssuingRegion}, country: {IssuingCountry})", person.Id, idType.Value, extracted.IssuingRegion, extracted.IssuingCountry);
            return;
        }

        // Convert to ISO Alpha-3 for country-based IDs (Plaid provides Alpha-2)
        if (idType is IdentificationType.Passport or IdentificationType.ResidentId)
        {
            locationCode = countryListService.GetAlpha3Code(locationCode);
        }

        var issueDate = DetermineIssueDate(existingIdentification);
        var expirationDate = extracted.ExpirationDate ?? existingIdentification?.ExpirationDate;

        var frontImageUrl = PreferImage(document.Images.CroppedFront, document.Images.OriginalFront);
        if (frontImageUrl is null)
        {
            logger.LogWarning("Skipping Plaid identification persistence for person {PersonId}: Front image URL missing", person.Id);
            return;
        }

        var frontImageBytes = await DownloadPlaidImageAsync(frontImageUrl, cancellationToken);
        if (frontImageBytes is null || frontImageBytes.Length == 0)
        {
            logger.LogWarning("Skipping Plaid identification persistence for person {PersonId}: Front image download failed or returned empty", person.Id);
            return;
        }

        frontImageBytes = NormalizeImage(frontImageBytes);

        var backImageUrl = PreferImage(document.Images.CroppedBack, document.Images.OriginalBack);
        var backImageBytes = backImageUrl is not null
            ? await DownloadPlaidImageAsync(backImageUrl, cancellationToken)
            : null;

        if (backImageBytes is not null && backImageBytes.Length > 0)
        {
            backImageBytes = NormalizeImage(backImageBytes);
        }

        if (existingIdentification is not null)
        {
            db.Remove(existingIdentification);
        }

        var identification = ApplicationPersonIdentification.Create(
            person.Id,
            idType.Value,
            locationCode,
            idNumber,
            issueDate,
            expirationDate);

        var frontImage = ApplicationImage.Create("image/jpeg", frontImageBytes);
        ApplicationImage? backImage = null;
        if (backImageBytes is not null && backImageBytes.Length > 0 && backImageUrl is not null)
        {
            backImage = ApplicationImage.Create("image/jpeg", backImageBytes);
        }

        identification.UpdateImages(frontImage, backImage);
        db.Add(identification);
    }

    private async Task<byte[]?> DownloadPlaidImageAsync(string url, CancellationToken cancellationToken)
    {
        try
        {
            var client = httpClientFactory.CreateClient(nameof(PlaidIdentityDocumentService));
            using var response = await client.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Failed to download Plaid image from {Url}: HTTP {StatusCode}", url, response.StatusCode);
                return null;
            }

            return await response.Content.ReadAsByteArrayAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Exception downloading Plaid image from {Url}", url);
            return null;
        }
    }

    private static IdentificationType? MapDocumentCategoryToIdentificationType(PhysicalDocumentCategory category)
    {
        return category switch
        {
            PhysicalDocumentCategory.DriversLicense => IdentificationType.DriverLicense,
            PhysicalDocumentCategory.IdCard => IdentificationType.StateId,
            PhysicalDocumentCategory.Passport => IdentificationType.Passport,
            PhysicalDocumentCategory.ResidencePermitCard or PhysicalDocumentCategory.ResidentCard or PhysicalDocumentCategory.Visa => IdentificationType.ResidentId,
            _ => null
        };
    }

    private static string? PreferImage(string? primary, string? secondary)
    {
        if (!string.IsNullOrWhiteSpace(primary))
        {
            return primary;
        }

        return !string.IsNullOrWhiteSpace(secondary) ? secondary : null;
    }

    private static string? DetermineLocationCode(
        IdentificationType idType,
        PhysicalDocumentExtractedData extracted,
        ApplicationPerson person,
        ApplicationPersonIdentification? existingIdentification)
    {
        return idType switch
        {
            IdentificationType.DriverLicense or IdentificationType.StateId => NormalizeStateCode(
                extracted.IssuingRegion ??
                existingIdentification?.StateCode ??
                person.Addresses?.FirstOrDefault(address => address.AddressType == AddressType.Primary)?.StateCode ??
                person.Addresses?.FirstOrDefault()?.StateCode),
            IdentificationType.Passport or IdentificationType.ResidentId => NormalizeCountryCode(
                extracted.IssuingCountry),
            _ => null
        };
    }

    private static DateOnly? DetermineIssueDate(ApplicationPersonIdentification? existingIdentification)
    {
        return existingIdentification?.IssueDate;
    }

    private static string? NormalizeStateCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return null;
        }

        var trimmed = code.Trim();
        var parts = trimmed.Split('-', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var candidate = parts.Length > 1 ? parts[^1] : trimmed;
        candidate = candidate.Length > 2 ? candidate[^2..] : candidate;
        return candidate.ToUpperInvariant();
    }

    private static string? NormalizeCountryCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return null;
        }

        var trimmed = code.Trim().ToUpperInvariant();
        return trimmed.Length <= 3 ? trimmed : trimmed[..3];
    }

    private static bool HasFrontImage(PhysicalDocumentImages images)
    {
        return !string.IsNullOrWhiteSpace(images.OriginalFront) || !string.IsNullOrWhiteSpace(images.CroppedFront);
    }

    private static byte[] NormalizeImage(byte[] sourceBytes)
    {
        using var image = new MagickImage(sourceBytes);

        image.AutoOrient();

        var isLandscape = image.Width > image.Height;
        image.Resize(isLandscape ? 0 : (uint)720, isLandscape ? (uint)720 : 0);
        image.ColorAlpha(MagickColors.White);
        image.Format = MagickFormat.Jpg;

        return image.ToByteArray();
    }
}
