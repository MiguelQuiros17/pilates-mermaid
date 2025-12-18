using Aloha.Infrastructure;
using Aloha.Domain.Products;
using Microsoft.EntityFrameworkCore;

namespace Aloha.Customer.Web.Utilities;

/// <summary>
/// Contains utilities for gathering information about a UserApplication's contents
/// </summary>
public static class UserApplicationAnalysisUtils
{
    /// <summary>
    /// Finds UserApplication by provided appKey and returns true if there are any CardProducts available
    /// that can be used with the selected share products
    /// </summary>
    public static async Task<bool> HasSelectedAnyShareProductsEligibleForCardOrderingAsync(AlohaDb db, Guid appKey)
    {
        var selectedTypes = await db.ApplicationShareProducts
            .Where(x => x.UserApplication!.ApplicationKey == appKey)
            .Select(x => x.ShareProductId)
            .ToListAsync();

        if (!selectedTypes.Any())
        {
            return false;
        }
        
        // Get all enabled cards (manually filter since GetEnabledProducts may not be accessible)
        var allEnabledCards = await db.CardProducts
            .Where(card => card.IsEnabled && card.DeleteDateUtc == null)
            .ToListAsync();
        
        var nonRestrictedCount = allEnabledCards.Count(c => !c.RestrictedCardProduct);
        
        var restrictedCardIds = allEnabledCards.Where(c => c.RestrictedCardProduct).Select(c => c.Id).ToList();
        
        var hasMatchingRestrictedCards = false;
        if (restrictedCardIds.Any())
        {
            // Use explicit IQueryable to avoid ambiguity and type inference issues
            IQueryable<CardShareTypeLink> linksQuery = db.CardShareTypeLinks
                .Where(link => restrictedCardIds.Contains(link.CardProductId));
            
            IQueryable<ShareProduct> shareProductsQuery = db.ShareProducts
                .Where(sp => sp.CardOrderEnabled && selectedTypes.Contains(sp.Id));
            
            var matchingLinks = await linksQuery
                .Join(
                    shareProductsQuery,
                    link => link.ShareProductId,
                    sp => sp.Id,
                    (link, sp) => link.CardProductId)
                .Distinct()
                .AnyAsync();
            
            hasMatchingRestrictedCards = matchingLinks;
        }
        
        return nonRestrictedCount > 0 || hasMatchingRestrictedCards;
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