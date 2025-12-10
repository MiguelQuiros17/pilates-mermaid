namespace Aloha.Domain.Questionnaires;

public class QuestionResponseSnapshot
{
    internal QuestionResponseSnapshot() { }

    public int QuestionId { get; internal set; }
    public string QuestionName { get; internal set; } = null!;
    public string? QuestionDescription { get; internal set; }
    public bool IsRequired { get; internal set; }
    public int SortOrder { get; internal set; }
    public QuestionType QuestionType { get; internal set; }

    public string? FreeFormResponse { get; internal set; }
    public int? SelectedMultipleChoiceOptionId { get; internal set; }
    public IList<MultipleChoiceResponseSnapshot>? MultipleChoiceResponses { get; internal set; }

    public static QuestionResponseSnapshot Create(
        int questionId,
        string questionName,
        string? questionDescription,
        bool isRequired,
        int sortOrder,
        QuestionType questionType,
        string? freeFormResponse,
        int? selectedMultipleChoiceOptionId,
        IList<MultipleChoiceResponseSnapshot>? multipleChoiceResponses)
    {
        return new QuestionResponseSnapshot
        {
            QuestionId = questionId,
            QuestionName = questionName,
            QuestionDescription = questionDescription,
            IsRequired = isRequired,
            SortOrder = sortOrder,
            QuestionType = questionType,
            FreeFormResponse = freeFormResponse,
            SelectedMultipleChoiceOptionId = selectedMultipleChoiceOptionId,
            MultipleChoiceResponses = multipleChoiceResponses
        };
    }
}