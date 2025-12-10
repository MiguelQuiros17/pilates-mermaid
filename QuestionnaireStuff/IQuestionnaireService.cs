namespace Aloha.Customer.Web.Services;

public interface IQuestionnaireService
{
    Task<bool> IsEveryRequiredApplicationQuestionnaireCompleteAsync();
    Task<bool> IsEveryRequiredApplicantQuestionnaireCompleteAsync();
    Task<bool> IsEveryRequiredProductQuestionnaireCompleteAsync();
}