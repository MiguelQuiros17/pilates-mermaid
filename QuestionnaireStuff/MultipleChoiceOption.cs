using Aloha.Domain.ProductApplications;

namespace Aloha.Domain.Questionnaires;

public class QuestionnaireApplicationTypeLink
{
    internal QuestionnaireApplicationTypeLink() { }

    public int Id { get; internal set; }
    
    public int QuestionnaireId { get; internal set; }
    public virtual Questionnaire? Questionnaire { get; internal set; }

    public int ProductApplicationTypeId { get; internal set; }
    public virtual ProductApplicationType? ProductApplicationType { get; internal set; }

    public static QuestionnaireApplicationTypeLink Create(int questionnaireId, int productApplicationTypeId) =>
        new()
        {
            QuestionnaireId = questionnaireId,
            ProductApplicationTypeId = productApplicationTypeId,
        };
}