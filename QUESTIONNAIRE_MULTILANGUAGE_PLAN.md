# Questionnaire Multilanguage Implementation Plan

## Overview
This document outlines what's needed to add multilanguage support to all text portions of questionnaires, including questions, question groups, multiple choice options, and dependent options.

## Translatable Fields Identified

### 1. Questionnaire (✅ Already Implemented)
- **Name** - `Questionnaire.Name`
- **Description** - `Questionnaire.Description`
- Resource Key Format: `"Questionnaire.{Id}"`
- Keys: `"Name"`, `"Description"`

### 2. Question (Ungrouped and Grouped)
- **Name** - `Question.Name`
- **Description** - `Question.Description` (optional)
- Resource Key Format: `"Question.{Id}"`
- Keys: `"Name"`, `"Description"`

### 3. QuestionGroup
- **Name** - `QuestionGroup.Name`
- **Description** - `QuestionGroup.Description` (optional)
- Resource Key Format: `"QuestionGroup.{Id}"`
- Keys: `"Name"`, `"Description"`

### 4. MultipleChoiceOption
- **Name** - `MultipleChoiceOption.Name`
- **DependentQuestionName** - `MultipleChoiceOption.DependentQuestionName` (optional)
- Resource Key Format: `"MultipleChoiceOption.{Id}"`
- Keys: `"Name"`, `"DependentQuestionName"`

### 5. DependentMultipleChoiceOption
- **Name** - `DependentMultipleChoiceOption.Name`
- **FreeFormFieldDescription** - `DependentMultipleChoiceOption.FreeFormFieldDescription` (optional)
- Resource Key Format: `"DependentMultipleChoiceOption.{Id}"`
- Keys: `"Name"`, `"FreeFormFieldDescription"`

## Implementation Requirements

### Option 1: Modify QuestionnaireForm Component (Recommended)
**What's Needed:**
1. Access to `QuestionnaireForm.razor` component file
2. Modify the component to:
   - Add translation dictionaries to `QuestionnaireForm.Input` class for all translatable fields
   - Replace text inputs with `MultiLanguageInput` components
   - Load translations when component initializes
   - Save translations when form is submitted

**Pros:**
- Clean, integrated solution
- All translations in one place
- Better user experience

**Cons:**
- Requires modifying existing component
- More complex component structure

### Option 2: Translation Interceptor/Wrapper
**What's Needed:**
1. Create a translation management system that:
   - Intercepts `QuestionnaireForm.Input` before submission
   - Loads all translations for questions, groups, options
   - Merges translations into form values
   - Saves translations after entity creation/update

2. Create a separate translation editing UI that:
   - Lists all questions, groups, options
   - Allows editing translations for each field
   - Integrates with bulk translation

**Pros:**
- Doesn't require modifying QuestionnaireForm
- Can be added incrementally

**Cons:**
- More complex data flow
- Separate UI for translations
- Potential synchronization issues

### Option 3: Hybrid Approach (Recommended for Incremental Implementation)
**What's Needed:**
1. Keep QuestionnaireForm as-is for primary language editing
2. Add a "Translations" tab/section that:
   - Shows all translatable fields in a structured list
   - Allows editing translations for each field
   - Uses MultiLanguageInput components
   - Supports bulk translation

3. Intercept form submission to:
   - Save primary language values (current behavior)
   - Save all translations from the translations section

**Pros:**
- Minimal changes to existing code
- Clear separation of concerns
- Can be implemented incrementally

**Cons:**
- Two-step editing process
- More UI complexity

## Data Structure Requirements

### Translation Storage Dictionary
```csharp
// For each entity type, we need to store translations
private Dictionary<int, Dictionary<string, Dictionary<string, string>>> questionTranslations = new();
// Key structure: questionId -> fieldName -> languageCode -> translatedText
// Example: questionTranslations[5]["Name"]["es-CR"] = "Pregunta en español"

private Dictionary<int, Dictionary<string, Dictionary<string, string>>> questionGroupTranslations = new();
private Dictionary<int, Dictionary<string, Dictionary<string, string>>> optionTranslations = new();
private Dictionary<int, Dictionary<string, Dictionary<string, string>>> dependentOptionTranslations = new();
```

### Alternative: Unified Translation Store
```csharp
private class TranslationStore
{
    public Dictionary<string, string> Questionnaire { get; set; } = new();
    public Dictionary<int, QuestionTranslations> Questions { get; set; } = new();
    public Dictionary<int, QuestionGroupTranslations> QuestionGroups { get; set; } = new();
    public Dictionary<int, OptionTranslations> Options { get; set; } = new();
    public Dictionary<int, DependentOptionTranslations> DependentOptions { get; set; } = new();
}

private class QuestionTranslations
{
    public Dictionary<string, string> Name { get; set; } = new();
    public Dictionary<string, string> Description { get; set; } = new();
}
```

## Implementation Steps

### Phase 1: Data Loading Infrastructure
1. Create method to load all translations for a questionnaire:
   ```csharp
   private async Task LoadAllQuestionnaireTranslations()
   {
       // Load translations for:
       // - All questions (ungrouped and grouped)
       // - All question groups
       // - All multiple choice options
       // - All dependent options
   }
   ```

2. Create helper methods for each entity type:
   ```csharp
   private async Task LoadQuestionTranslations(int questionId)
   private async Task LoadQuestionGroupTranslations(int groupId)
   private async Task LoadOptionTranslations(int optionId)
   private async Task LoadDependentOptionTranslations(int dependentOptionId)
   ```

### Phase 2: Translation Saving Infrastructure
1. Modify `UpdateQuestionnaire` to save translations for all entities:
   ```csharp
   private async Task SaveAllQuestionnaireTranslations(AlohaDb db, QuestionnaireForm.Input values)
   {
       // Save translations for all created/updated entities
       // Need to track entity IDs as they're created
   }
   ```

2. Create helper methods for each entity type:
   ```csharp
   private async Task SaveQuestionTranslations(int questionId, string name, string? description)
   private async Task SaveQuestionGroupTranslations(int groupId, string name, string? description)
   private async Task SaveOptionTranslations(int optionId, string name, string? dependentQuestionName)
   private async Task SaveDependentOptionTranslations(int dependentOptionId, string name, string? freeFormDescription)
   ```

### Phase 3: UI Components
1. **Option A: Modify QuestionnaireForm**
   - Replace text inputs with MultiLanguageInput
   - Add translation dictionaries to Input class
   - Update load/save logic

2. **Option B: Separate Translation Editor**
   - Create `QuestionnaireTranslationsEditor.razor` component
   - Display all translatable fields in expandable sections
   - Use MultiLanguageInput for each field
   - Integrate with bulk translation

### Phase 4: Bulk Translation
1. Extend `OnBulkTranslateAll` to handle all fields:
   ```csharp
   private async Task OnBulkTranslateAllQuestionnaire()
   {
       // Translate questionnaire Name/Description
       // Translate all questions
       // Translate all question groups
       // Translate all options
       // Translate all dependent options
   }
   ```

2. Update `HasEnglishText` to check all fields
3. Update `GetFieldsWithExistingText` to list all fields

## Key Challenges

### 1. Entity ID Tracking
- Questions, groups, and options are created during form submission
- Need to track IDs as entities are created to save translations
- Solution: Save translations immediately after each entity is created

### 2. QuestionnaireForm Component Access
- Need to see QuestionnaireForm.razor to understand its structure
- May need to modify it or create a wrapper

### 3. Dynamic Content
- Questions and options are added/removed dynamically
- Translation UI must handle dynamic content
- Solution: Use dictionaries keyed by entity ID or temporary IDs

### 4. Performance
- Loading translations for many entities could be slow
- Solution: Batch load translations, use async/await efficiently

## Recommended Approach

**Start with Option 3 (Hybrid Approach):**

1. **Step 1**: Create translation loading/saving infrastructure
2. **Step 2**: Add a "Translations" section to QuestionnaireEditPage
3. **Step 3**: Display all translatable fields in expandable sections
4. **Step 4**: Integrate bulk translation for all fields
5. **Step 5**: Save translations when form is submitted

This approach:
- ✅ Doesn't require modifying QuestionnaireForm immediately
- ✅ Can be tested incrementally
- ✅ Provides clear separation between primary language editing and translations
- ✅ Can be enhanced later to integrate directly into QuestionnaireForm

## Next Steps

To proceed, I would need:

1. **Access to QuestionnaireForm.razor** - To understand its structure
2. **Entity class definitions** - To confirm property names and access modifiers
3. **Decision on approach** - Which option to implement
4. **UI preference** - How translations should be edited (inline vs separate section)

Would you like me to:
- A) Create the translation infrastructure first (loading/saving methods)?
- B) Create a separate translations editor component?
- C) Attempt to modify QuestionnaireForm if you can provide access to it?

