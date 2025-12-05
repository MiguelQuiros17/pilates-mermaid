using Aloha.Domain.Applications;
using Aloha.Domain.Identity.AdminUsers;
using Aloha.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Aloha.Domain.Services.Application;

public class ApplicationInternalCommentService : IApplicationInternalCommentService
{
    private readonly IDbContextFactory<AlohaDb> _dbFactory;
    private readonly ICsvExportHelperService _csvHelper;

    public ApplicationInternalCommentService(IDbContextFactory<AlohaDb> dbFactory, ICsvExportHelperService csvHelper)
    {
        _dbFactory = dbFactory;
        _csvHelper = csvHelper;
    }

    public async Task<IList<ApplicationInternalComment>> GetCommentsForApplicationAsync(int applicationId)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        return await db.Set<ApplicationInternalComment>()
            .Where(c => c.UserApplicationId == applicationId)
            .OrderByDescending(c => c.CreatedAtUtc)
            .ToListAsync();
    }

    public async Task<ApplicationInternalComment> AddCommentAsync(int applicationId, string adminUserId, string text)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        
        var comment = new ApplicationInternalComment
        {
            UserApplicationId = applicationId,
            AdminUserId = adminUserId,
            Text = text.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };
        
        db.Set<ApplicationInternalComment>().Add(comment);
        await db.SaveChangesAsync();
        
        return comment;
    }

    public async Task<ApplicationInternalComment?> UpdateCommentAsync(int commentId, string adminUserId, string text)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        
        var comment = await db.Set<ApplicationInternalComment>()
            .FirstOrDefaultAsync(c => c.Id == commentId && c.AdminUserId == adminUserId);
        
        if (comment == null)
            return null;
        
        comment.Text = text.Trim();
        comment.EditedAtUtc = DateTime.UtcNow;
        
        await db.SaveChangesAsync();
        
        return comment;
    }

    public async Task<bool> DeleteCommentAsync(int commentId, string adminUserId)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        
        var comment = await db.Set<ApplicationInternalComment>()
            .FirstOrDefaultAsync(c => c.Id == commentId && c.AdminUserId == adminUserId);
        
        if (comment == null)
            return false;
        
        db.Set<ApplicationInternalComment>().Remove(comment);
        await db.SaveChangesAsync();
        
        return true;
    }

    public async Task<byte[]> ExportCommentsToCsvAsync(int applicationId, Dictionary<string, string> adminUserCache, string? timezoneId)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        
        var comments = await db.Set<ApplicationInternalComment>()
            .Where(c => c.UserApplicationId == applicationId)
            .OrderByDescending(c => c.CreatedAtUtc)
            .ToListAsync();
        
        var csv = new System.Text.StringBuilder();
        csv.AppendLine("Admin User,Created Date/Time,Last Edited Date/Time,Comment");
        
        foreach (var comment in comments)
        {
            var adminName = adminUserCache.TryGetValue(comment.AdminUserId, out var name) ? name : "Unknown User";
            var createdDate = _csvHelper.FormatDateTimeForCsv(comment.CreatedAtUtc, timezoneId);
            var editedDate = comment.EditedAtUtc.HasValue ? _csvHelper.FormatDateTimeForCsv(comment.EditedAtUtc.Value, timezoneId) : "";
            var text = _csvHelper.EscapeCsvField(comment.Text);
            
            csv.AppendLine($"{_csvHelper.EscapeCsvField(adminName)},{createdDate},{editedDate},{text}");
        }
        
        return System.Text.Encoding.UTF8.GetBytes(csv.ToString());
    }
}

