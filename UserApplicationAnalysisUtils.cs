using Aloha.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Aloha.Customer.Web.Utilities;

/// <summary>
/// Contains utilities for gathering information about a UserApplication's contents
/// </summary>
public static class UserApplicationAnalysisUtils
{
    /// <summary>
    /// Finds UserApplication by provided appKey and returns true if there are any CardProducts available
    /// that can be used with the selected share products (computed the same way as AddCard.razor)
    /// </summary>
    public static async Task<bool> HasSelectedAnyShareProductsEligibleForCardOrderingAsync(AlohaDb db, Guid appKey)
    {
        // Get selected share product IDs (same logic as AddCard.razor)
        var selectedTypes = await db.ApplicationShareProducts
            .Where(x => x.UserApplication!.ApplicationKey == appKey)
            .Select(x => x.ShareProductId)
            .ToListAsync();

        // Check if there are any CardProducts available that can be used with these share products
        // (same logic as AddCard.razor)
        var hasCardProducts = await db.CardProducts
            .Include(x => x.CardShareTypeLinks!)
            .ThenInclude(link => link.ShareProduct)
            .Where(x =>
                !x.RestrictedCardProduct
                ||
                x.CardShareTypeLinks!.Any(link =>
                    link.ShareProduct != null &&
                    link.ShareProduct.CardOrderEnabled &&
                    selectedTypes.Contains(link.ShareProductId)))
            .AnyAsync();

        return hasCardProducts;
    }

    public static async Task<bool> HasSelectedAnyProductsWithQuestionnaires(AlohaDb db, Guid appKey)
    {
        var userApp = await db.UserApplications
            .AsSplitQuery()
            .Include(userApplication => userApplication.ApplicationShareProducts!)
            .ThenInclude(applicationShareProduct => applicationShareProduct.ShareProduct!)
            .ThenInclude(shareProduct => shareProduct.QuestionnaireShareProductLinks!)
            .ThenInclude(questionnaireShareProductLink => questionnaireShareProductLink.Questionnaire)
            .Include(userApplication => userApplication.ApplicationLoanProducts!)
            .ThenInclude(applicationLoanProduct => applicationLoanProduct.LoanProduct!)
            .ThenInclude(loanProduct => loanProduct.QuestionnaireLoanProductLinks!)
            .ThenInclude(questionnaireLoanProductLink => questionnaireLoanProductLink.Questionnaire)
            .FirstAsync(x => x.ApplicationKey == appKey);

        var hasQuestionnairesForShares = (userApp.ApplicationShareProducts ?? [])
            .Any(appShareProduct => (appShareProduct.ShareProduct!.QuestionnaireShareProductLinks ?? [])
                .Any(x => x.Questionnaire is { IsDeleted: false, IsEnabled: true }));

        if (hasQuestionnairesForShares)
        {
            return true;
        }

        var hasQuestionnairesForLoans = (userApp.ApplicationLoanProducts ?? [])
            .Any(appLoanProduct => (appLoanProduct.LoanProduct!.QuestionnaireLoanProductLinks ?? [])
                .Any(x => x.Questionnaire is { IsDeleted: false, IsEnabled: true }));

        if (hasQuestionnairesForLoans)
        {
            return true;
        }
        
        return false;
    }
}