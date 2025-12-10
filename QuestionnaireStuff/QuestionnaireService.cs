using Aloha.Domain.ApplicationPersons;
using Aloha.Domain.ApplicationProducts;
using Aloha.Domain.Questionnaires;
using Aloha.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Aloha.Customer.Web.Services;

public class QuestionnaireService(
    IDbContextFactory<AlohaDb> dbFactory,
    IApplicationStateProvider appState
) : IQuestionnaireService
{
    public async Task<bool> IsEveryRequiredApplicationQuestionnaireCompleteAsync()
    {
        await using var db = await dbFactory.CreateDbContextAsync();
        var appKey = await appState.GetCurrentApplicationKeyAsync();

        var app = await db.UserApplications
            .Include(userApplication => userApplication.ProductApplicationType!)
            .ThenInclude(productApplicationType => productApplicationType.QuestionnaireApplicationTypeLinks!)
            .ThenInclude(questionnaireApplicationTypeLink => questionnaireApplicationTypeLink.Questionnaire)
            .Include(userApplication => userApplication.QuestionnaireResponses!)
            .ThenInclude(questionnaireResponse => questionnaireResponse.Questionnaire!)
            .FirstAsync(x => x.ApplicationKey == appKey);

        var questionnaireApplicationTypeLinks = app.ProductApplicationType!.QuestionnaireApplicationTypeLinks;
        var requiredQuestionnaireIds = new HashSet<int>();

        IList<Questionnaire> questionnaires = [];

        if (questionnaireApplicationTypeLinks != null)
        {
            foreach (var link in questionnaireApplicationTypeLinks
                         .Where(x => x.Questionnaire is { IsEnabled: true, IsDeleted: false })
                         .Where(x => x.Questionnaire?.Level == QuestionnaireLevel.Application))
            {
                if (link.Questionnaire == null)
                {
                    continue;
                }

                questionnaires.Add(link.Questionnaire);

                if (link.Questionnaire.IsRequired)
                {
                    requiredQuestionnaireIds.Add(link.Questionnaire.Id);
                }
            }
        }

        if (!questionnaires.Any())
        {
            return true;
        }

        HashSet<int> completedQuestionnaireIdSet = [];

        if (app.QuestionnaireResponses is not null)
        {
            foreach (var response in app.QuestionnaireResponses
                         .Where(x => x.QuestionnaireLevel == QuestionnaireLevel.Application)
                         .Where(x => x.Questionnaire!.IsEnabled && !x.Questionnaire!.IsDeleted))
            {
                completedQuestionnaireIdSet.Add(response.QuestionnaireId);
            }
        }

        return completedQuestionnaireIdSet.IsSupersetOf(requiredQuestionnaireIds);
    }

    public async Task<bool> IsEveryRequiredApplicantQuestionnaireCompleteAsync()
    {
        await using var db = await dbFactory.CreateDbContextAsync();
        var appKey = await appState.GetCurrentApplicationKeyAsync();

        var app = await db.UserApplications
            .Include(userApplication => userApplication.ProductApplicationType!)
            .ThenInclude(productApplicationType => productApplicationType.QuestionnaireApplicationTypeLinks!)
            .ThenInclude(questionnaireApplicationTypeLink => questionnaireApplicationTypeLink.Questionnaire)
            .Include(userApplication => userApplication.QuestionnaireResponses!)
            .ThenInclude(questionnaireResponse => questionnaireResponse.Questionnaire!)
            .Include(userApplication => userApplication.ApplicationPeople!)
            .ThenInclude(x => x.QuestionnaireResponses)
            .FirstAsync(x => x.ApplicationKey == appKey);

        var applicants = app.ApplicationPeople?
            .Where(person => person.PersonType != PersonType.Beneficiary)
            .ToArray() ?? [];

        var appPersonIdToCompletedQuestionnaireIdSetLookup =
            CreateAppPersonIdToCompletedQuestionnaireIdLookup(applicants);

        var questionnaires = (app.ProductApplicationType!.QuestionnaireApplicationTypeLinks ?? [])
            .Where(x => x.Questionnaire!.IsEnabled)
            .Where(x => !x.Questionnaire!.IsDeleted)
            .Where(x => x.Questionnaire!.Level is QuestionnaireLevel.Applicant)
            .Select(x => x.Questionnaire!)
            .ToArray();

        if (!questionnaires.Any())
        {
            return true;
        }

        var requiredQuestionnaireIdSet = new HashSet<int>();

        foreach (var questionnaire in questionnaires)
        {
            if (questionnaire.IsRequired)
            {
                requiredQuestionnaireIdSet.Add(questionnaire.Id);
            }
        }

        return applicants.All(applicant =>
            appPersonIdToCompletedQuestionnaireIdSetLookup[applicant.Id]
                .IsSupersetOf(requiredQuestionnaireIdSet));
    }

    public async Task<bool> IsEveryRequiredProductQuestionnaireCompleteAsync()
    {
        await using var db = await dbFactory.CreateDbContextAsync();
        var appKey = await appState.GetCurrentApplicationKeyAsync();

        var app = await db.UserApplications
            .AsSplitQuery()
            .Include(userApplication => userApplication.ApplicationShareProducts!)
            .ThenInclude(applicationShareProduct => applicationShareProduct.ShareProduct!)
            .ThenInclude(shareProduct => shareProduct.QuestionnaireShareProductLinks!)
            .ThenInclude(questionnaireShareProductLink => questionnaireShareProductLink.Questionnaire!)
            .ThenInclude(questionnaire => questionnaire.QuestionnaireApplicationTypeLinks)
            .Include(userApplication => userApplication.ApplicationLoanProducts!)
            .ThenInclude(applicationLoanProduct => applicationLoanProduct.LoanProduct!)
            .ThenInclude(loanProduct => loanProduct.QuestionnaireLoanProductLinks!)
            .ThenInclude(questionnaireLoanProductLink => questionnaireLoanProductLink.Questionnaire!)
            .ThenInclude(questionnaire => questionnaire.QuestionnaireApplicationTypeLinks)
            .Include(userApplication => userApplication.QuestionnaireResponses!)
            .ThenInclude(questionnaireResponse => questionnaireResponse.ApplicationShareProduct)
            .FirstAsync(x => x.ApplicationKey == appKey);

        var appShareProductIdToCompletedQuestionnaireSetLookup = new Dictionary<int, HashSet<int>>();
        var appShareProductIdToRequiredQuestionnaireSetLookup = new Dictionary<int, HashSet<int>>();
        IList<QuestionnaireProduct> questionnaireProducts = [];
        
        foreach (var appShareProduct in app.ApplicationShareProducts ?? [])
        {
            var questionnaireProduct = new QuestionnaireProduct
            {
                ProductName = appShareProduct.ShareProduct?.ProductDisplayName ?? string.Empty,
                Questionnaires = (appShareProduct.ShareProduct?.QuestionnaireShareProductLinks ?? [])
                    .Where(x => x.Questionnaire is { IsEnabled: true, IsDeleted: false })
                    .Where(x => x.Questionnaire?.QuestionnaireApplicationTypeLinks != null &&
                        x.Questionnaire.QuestionnaireApplicationTypeLinks.Any(link =>
                            link.ProductApplicationTypeId == app.ProductApplicationTypeId))
                    .Select(x => x.Questionnaire!)
                    .ToArray(),
                AppShareProduct = appShareProduct
            };

            if (!questionnaireProduct.Questionnaires.Any())
            {
                continue;
            }

            appShareProductIdToCompletedQuestionnaireSetLookup[appShareProduct.Id] = [];

            appShareProductIdToRequiredQuestionnaireSetLookup[appShareProduct.Id] = questionnaireProduct.Questionnaires
                .Where(x => x.IsRequired).Select(x => x.Id).ToHashSet();

            questionnaireProduct.QuestionnaireResponses = (app.QuestionnaireResponses ?? [])
                .Where(x => x.ApplicationShareProductId == appShareProduct.Id)
                .ToList();

            questionnaireProduct.CompletedQuestionnaireIds = (app.QuestionnaireResponses ?? [])
                .Where(x => x.ApplicationShareProductId == appShareProduct.Id)
                .Select(x => x.QuestionnaireId)
                .ToHashSet();

            questionnaireProducts.Add(questionnaireProduct);
        }

        var appLoanProductIdToCompletedQuestionnaireSetLookup = new Dictionary<int, HashSet<int>>();
        var appLoanProductIdToRequiredQuestionnaireSetLookup = new Dictionary<int, HashSet<int>>();

        foreach (var appLoanProduct in app.ApplicationLoanProducts ?? [])
        {
            var questionnaireProduct = new QuestionnaireProduct
            {
                ProductName = appLoanProduct.LoanProduct?.ProductDisplayName ?? string.Empty,
                Questionnaires = (appLoanProduct.LoanProduct?.QuestionnaireLoanProductLinks ?? [])
                    .Where(x => x.Questionnaire is { IsEnabled: true, IsDeleted: false })
                    .Where(x => x.Questionnaire?.QuestionnaireApplicationTypeLinks != null &&
                        x.Questionnaire.QuestionnaireApplicationTypeLinks.Any(link =>
                            link.ProductApplicationTypeId == app.ProductApplicationTypeId))
                    .Select(x => x.Questionnaire!)
                    .ToArray(),
                AppLoanProduct = appLoanProduct
            };

            if (!questionnaireProduct.Questionnaires.Any())
            {
                continue;
            }

            appLoanProductIdToCompletedQuestionnaireSetLookup[appLoanProduct.Id] = [];

            appLoanProductIdToRequiredQuestionnaireSetLookup[appLoanProduct.Id] = questionnaireProduct.Questionnaires
                .Where(x => x.IsRequired).Select(x => x.Id).ToHashSet();

            questionnaireProduct.QuestionnaireResponses = (app.QuestionnaireResponses ?? [])
                .Where(x => x.ApplicationLoanProductId == appLoanProduct.Id)
                .ToList();

            questionnaireProduct.CompletedQuestionnaireIds = (app.QuestionnaireResponses ?? [])
                .Where(x => x.ApplicationLoanProductId == appLoanProduct.Id)
                .Select(x => x.QuestionnaireId)
                .ToHashSet();

            questionnaireProducts.Add(questionnaireProduct);
        }

        if (!questionnaireProducts.Any())
        {
            return true;
        }

        foreach (var response in app.QuestionnaireResponses ?? [])
        {
            if (response.ApplicationShareProductId is not null &&
                appShareProductIdToCompletedQuestionnaireSetLookup.ContainsKey(response.ApplicationShareProductId
                    .Value))
            {
                appShareProductIdToCompletedQuestionnaireSetLookup[response.ApplicationShareProductId.Value]
                    .Add(response.QuestionnaireId);
            }

            if (response.ApplicationLoanProductId is not null &&
                appLoanProductIdToCompletedQuestionnaireSetLookup.ContainsKey(response.ApplicationLoanProductId.Value))
            {
                appLoanProductIdToCompletedQuestionnaireSetLookup[response.ApplicationLoanProductId.Value]
                    .Add(response.QuestionnaireId);
            }
        }

        var isEveryRequiredQuestionnaireCompleteForEachProduct = true;

        foreach (var (appShareProductId, requiredShareQuestionnaireSet) in
                 appShareProductIdToRequiredQuestionnaireSetLookup)
        {
            if (!appShareProductIdToCompletedQuestionnaireSetLookup[appShareProductId]
                    .IsSupersetOf(requiredShareQuestionnaireSet))
            {
                isEveryRequiredQuestionnaireCompleteForEachProduct = false;
            }
        }

        foreach (var (appLoanProductId, requiredLoanQuestionnaireSet) in
                 appLoanProductIdToRequiredQuestionnaireSetLookup)
        {
            if (!appLoanProductIdToCompletedQuestionnaireSetLookup[appLoanProductId]
                    .IsSupersetOf(requiredLoanQuestionnaireSet))
            {
                isEveryRequiredQuestionnaireCompleteForEachProduct = false;
            }
        }

        return isEveryRequiredQuestionnaireCompleteForEachProduct;
    }

    private static Dictionary<int, HashSet<int>> CreateAppPersonIdToCompletedQuestionnaireIdLookup(
        IList<ApplicationPerson> applicationPeople)
    {
        var appPersonIdToCompletedQuestionnaireIdSet = new Dictionary<int, HashSet<int>>();

        foreach (var appPerson in applicationPeople)
        {
            if (!appPersonIdToCompletedQuestionnaireIdSet.ContainsKey(appPerson.Id))
            {
                appPersonIdToCompletedQuestionnaireIdSet.Add(appPerson.Id, []);
            }

            var personQuestionnaireResponses = appPerson.QuestionnaireResponses ?? [];

            foreach (var response in personQuestionnaireResponses)
            {
                appPersonIdToCompletedQuestionnaireIdSet[appPerson.Id].Add(response.QuestionnaireId);
            }
        }

        return appPersonIdToCompletedQuestionnaireIdSet;
    }
    
    private class QuestionnaireProduct
    {
        public string ProductName { get; set; } = string.Empty;
        public IList<Questionnaire> Questionnaires { get; set; } = [];
        public ApplicationLoanProduct? AppLoanProduct { get; set; }
        public ApplicationShareProduct? AppShareProduct { get; set; }
        public HashSet<int> CompletedQuestionnaireIds { get; set; } = [];
        public IList<QuestionnaireResponse> QuestionnaireResponses { get; set; } = [];
    }
}