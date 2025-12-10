@using System.Linq.Expressions
@using Aloha.Domain.Questionnaires
@rendermode InteractiveServer

<li style=@(IsEditing ? "border-width: 2px; border-radius: 4px; border-color: var(--bs-primary); border-style: solid; padding: 8px" : string.Empty)>
    @if (IsEditing)
    {
        <p class="text-primary fw-bold mb-0">Currently Editing</p>
        <hr class="my-2"/>
    }
    <div class="d-flex justify-content-start" style="gap: 8px">
        @if (!IsReadOnly)
        {
            <div>
                <label for=@($"sort-question-{Question.DraftId}")>Sort*</label>
                <InputNumber id=@($"sort-question-{Question.DraftId}")
                             min="0"
                             disabled="@IsReadOnly"
                             Value="SortOrder"
                             ValueChanged="SortOrderChanged"
                             ValueExpression="SortOrderExpression"
                             class="form-control"
                             style="width: 64px"/>
            </div>
        }
        <div class="flex-fill">
            <div class="fw-bold">
                @($"{Question.Name}")
                @if (Question.IsRequired)
                {
                    <span class="text-danger">*</span>
                }
                @if (!string.IsNullOrWhiteSpace(Question.Description))
                {
                    <span class="fst-italic fw-normal"> - @Question.Description</span>
                }
            </div>

            <div>@Question.Type.ToDisplayName()</div>

            @if (
                Question.Type != QuestionType.FreeForm &&
                Question.MultipleChoiceOptions is not null &&
                Question.MultipleChoiceOptions.Any())
            {
                <ul>
                    @foreach (var option in Question.MultipleChoiceOptions.OrderBy(o => o.SortOrder))
                    {
                        <li>
                            <div>
                                @option.Name
                                @if (option.HasDependentQuestion)
                                {
                                    @if (!string.IsNullOrWhiteSpace(option.DependentQuestionName))
                                    {
                                        <span class="fst-italic">@($"- {option.DependentQuestionName}")</span>
                                    }

                                    <span> (@option.DependentQuestionType.ToDisplayName())</span>
                                }
                            </div>
                            @if (
                                option.HasDependentQuestion &&
                                option.DependentQuestionType is DependentQuestionType.SingleSelect or DependentQuestionType.MultipleSelect &&
                                option.DependentMultipleChoiceOptions is not null &&
                                option.DependentMultipleChoiceOptions.Any())
                            {
                                <ul>
                                    @foreach (var depOption in option.DependentMultipleChoiceOptions.OrderBy(o => o.SortOrder))
                                    {
                                        <li>
                                            <div>
                                                @depOption.Name
                                                @if (depOption.HasFreeFormField)
                                                {
                                                    <span class="fst-italic">
                                                        - @depOption.FreeFormFieldDescription
                                                    </span>
                                                    <span> (Free Form)</span>
                                                }
                                            </div>
                                        </li>
                                    }
                                </ul>
                            }
                        </li>
                    }
                </ul>
            }
        </div>
        @if (!IsReadOnly)
        {
            <div class="d-flex align-items-baseline gap-2">
                <button class="btn btn-outline-secondary"
                        type="button"
                        @onclick="@(async () => await OnEdit.InvokeAsync(Question))">
                    <Icon Name="IconName.PencilFill"/>
                </button>
                <button class="btn btn-outline-danger"
                        type="button"
                        @onclick="@(async () => await OnRemove.InvokeAsync(Question))">
                    <Icon Name="IconName.TrashFill"/>
                </button>
            </div>
        }
    </div>
</li>

@code {

    [Parameter]
    public bool IsReadOnly { get; set; }

    [Parameter]
    public bool IsEditing { get; set; }

    [Parameter, EditorRequired]
    public QuestionForm.DraftInput Question { get; set; } = default!;

    [Parameter]
    public int SortOrder { get; set; }

    [Parameter]
    public EventCallback<int> SortOrderChanged { get; set; }

    [Parameter]
    public Expression<Func<int>> SortOrderExpression { get; set; } = default!;

    [Parameter]
    public EventCallback<QuestionForm.DraftInput> OnRemove { get; set; }

    [Parameter, EditorRequired]
    public EventCallback<QuestionForm.DraftInput> OnEdit { get; set; }

}