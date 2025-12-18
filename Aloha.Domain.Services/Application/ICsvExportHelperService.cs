namespace Aloha.Domain.Services.Application;

public interface ICsvExportHelperService
{
    string EscapeCsvField(string? field);
    string FormatDateTimeForCsv(DateTime dateTime, string? timezoneId);
    string FormatDateTimeForCsv(DateTimeOffset dateTime, string? timezoneId);
}








