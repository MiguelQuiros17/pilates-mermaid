namespace Aloha.Domain.Questionnaires;

public class DependentMultipleChoiceResponseSnapshot
{
    internal DependentMultipleChoiceResponseSnapshot() { }

    public int DependentMultipleChoiceOptionId { get; internal set; }
    public string Name { get; internal set; } = null!;
    public int SortOrder { get; internal set; }
    public bool HasFreeFormField { get; internal set; }
    public string? DependentQuestionName { get; internal set; }

    public bool? IsChecked { get; internal set; }
    public string? FreeFormResponse { get; internal set; }

    public static DependentMultipleChoiceResponseSnapshot Create(
        int dependentMultipleChoiceOptionId,
        string name,
        int sortOrder,
        bool? isChecked,
        bool hasFreeFormField,
        string? dependentQuestionName,
        string? freeFormResponse)
    {
        return new DependentMultipleChoiceResponseSnapshot
        {
            DependentMultipleChoiceOptionId = dependentMultipleChoiceOptionId,
            Name = name,
            SortOrder = sortOrder,
            HasFreeFormField = hasFreeFormField,
            DependentQuestionName = dependentQuestionName,
            IsChecked = isChecked,
            FreeFormResponse = freeFormResponse
        };
    }
}