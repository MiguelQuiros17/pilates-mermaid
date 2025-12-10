using Aloha.Domain.ApplicationPersons;
using Aloha.Domain.ApplicationProducts;
using Aloha.Domain.Applications;

namespace Aloha.Domain.Questionnaires;

public class QuestionnaireResponse
{
    internal QuestionnaireResponse() { }

    public int Id { get; internal set; }
    public string QuestionnaireName { get; internal set; } = null!;
    public QuestionnaireLevel QuestionnaireLevel { get; internal set; } = QuestionnaireLevel.Application;
    public int QuestionnaireVersion { get; internal set; }

    public int QuestionnaireId { get; internal set; }
    public virtual Questionnaire? Questionnaire { get; internal set; }

    public int UserApplicationId { get; internal set; }
    public virtual UserApplication? UserApplication { get; internal set; }

    public int? ApplicationPersonId { get; internal set; }
    public virtual ApplicationPerson? ApplicationPerson { get; internal set; }

    public int? ApplicationShareProductId { get; internal set; }
    public virtual ApplicationShareProduct? ApplicationShareProduct { get; internal set; }

    public int? ApplicationLoanProductId { get; internal set; }
    public virtual ApplicationLoanProduct? ApplicationLoanProduct { get; internal set; }

    public virtual IList<QuestionResponse>? QuestionResponses { get; internal set; }
    public virtual IList<QuestionResponseGroup>? QuestionResponseGroups { get; internal set; }

    public static QuestionnaireResponse Create(
        int questionnaireId,
        string questionnaireName,
        QuestionnaireLevel questionnaireLevel,
        int questionnaireVersion,
        int userApplicationId,
        int? applicationPersonId,
        int? applicationShareProductId,
        int? applicationLoanProductId)
    {
        return new QuestionnaireResponse
        {
            QuestionnaireId = questionnaireId,
            QuestionnaireName = questionnaireName,
            QuestionnaireLevel = questionnaireLevel,
            QuestionnaireVersion = questionnaireVersion,
            UserApplicationId = userApplicationId,
            ApplicationPersonId = applicationPersonId,
            ApplicationShareProductId = applicationShareProductId,
            ApplicationLoanProductId = applicationLoanProductId,
        };
    }
}