using Aloha.Domain.Applications;

namespace Aloha.Domain.Services.Application;

public interface IApplicationInternalCommentService
{
    Task<IList<ApplicationInternalComment>> GetCommentsForApplicationAsync(int applicationId);
    Task<ApplicationInternalComment> AddCommentAsync(int applicationId, string adminUserId, string text);
    Task<ApplicationInternalComment?> UpdateCommentAsync(int commentId, string adminUserId, string text);
    Task<bool> DeleteCommentAsync(int commentId, string adminUserId);
    Task<byte[]> ExportCommentsToCsvAsync(int applicationId, Dictionary<string, string> adminUserCache, string? timezoneId);
}



