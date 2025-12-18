namespace Aloha.Domain.Services.Application;

public class CsvExportHelperService : ICsvExportHelperService
{
    public string EscapeCsvField(string? field)
    {
        if (string.IsNullOrEmpty(field))
            return string.Empty;

        var needsQuotes =
            field.Contains(',') ||
            field.Contains('"') ||
            field.Contains('\n') ||
            field.Contains('\r');

        if (!needsQuotes)
            return field;

        var escaped = field.Replace("\"", "\"\"");

        return "\"" + escaped + "\"";
    }

    public string FormatDateTimeForCsv(DateTime dateTime, string? timezoneId)
    {
        if (!string.IsNullOrEmpty(timezoneId))
        {
            try
            {
                TimeZoneInfo selectedZone = TimeZoneInfo.FindSystemTimeZoneById(timezoneId);
                DateTime selectedTime = TimeZoneInfo.ConvertTimeFromUtc(dateTime, selectedZone);
                return selectedTime.ToString("yyyy-MM-dd HH:mm:ss");
            }
            catch
            {
                return dateTime.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss");
            }
        }
        return dateTime.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss");
    }

    public string FormatDateTimeForCsv(DateTimeOffset dateTime, string? timezoneId)
    {
        DateTime timeUtc = dateTime.ToUniversalTime().DateTime;
        if (!string.IsNullOrEmpty(timezoneId))
        {
            try
            {
                TimeZoneInfo selectedZone = TimeZoneInfo.FindSystemTimeZoneById(timezoneId);
                DateTime selectedTime = TimeZoneInfo.ConvertTimeFromUtc(timeUtc, selectedZone);
                return selectedTime.ToString("yyyy-MM-dd HH:mm:ss");
            }
            catch
            {
                return dateTime.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss");
            }
        }
        return dateTime.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss");
    }
}








