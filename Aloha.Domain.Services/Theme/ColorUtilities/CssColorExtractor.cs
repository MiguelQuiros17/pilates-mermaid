using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

namespace Aloha.Domain.Services.Theme.ColorUtilities;

public static class CssColorExtractor
{
    private static ILogger? _logger;

    public static void SetLogger(ILogger logger)
    {
        _logger = logger;
    }

    public static void ExtractColors(string css, string source, List<ColorEntry> colorList)
    {
        if (string.IsNullOrWhiteSpace(css)) return;
        var scan = CssColorUtils.StripCssComments(css);
        var rx = new Regex(@"
            (?<hex>\#(?:[0-9a-fA-F]{3}\b|[0-9a-fA-F]{6}\b))
            |(?<rgb>rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))
            |(?<hsl>hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))
        ", RegexOptions.Compiled | RegexOptions.IgnorePatternWhitespace);

        var matches = rx.Matches(scan);
        var propsSeen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var occurrenceCounter = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        ExtractNamedTokens(scan, source, colorList, propsSeen, occurrenceCounter);
        ExtractRgbTriples(scan, source, colorList, propsSeen, occurrenceCounter);
        ExtractColorLiterals(scan, source, matches, colorList, propsSeen, occurrenceCounter);
    }

    private static void ExtractNamedTokens(string scan, string source, List<ColorEntry> colorList, HashSet<string> propsSeen, Dictionary<string, int> occurrenceCounter)
    {
        try
        {
            var declRx = new Regex(@"(?<prop>--?[\w-]+|\b[\w-]+\b)\s*:\s*(?<val>[^;{]+);", RegexOptions.Compiled | RegexOptions.IgnoreCase);
            foreach (Match decl in declRx.Matches(scan))
            {
                var property = decl.Groups["prop"].Value.Trim();
                var valRaw = decl.Groups["val"].Value.Trim();
                if (string.IsNullOrEmpty(property) || string.IsNullOrEmpty(valRaw)) continue;

                var parts = valRaw.Split(',')
                    .SelectMany(p => p.Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries))
                    .Select(t => t.Trim().TrimEnd(';').Trim())
                    .Where(t => !string.IsNullOrEmpty(t))
                    .ToArray();

                var selector = GetSelectorForToken(scan, decl.Index);
                var occKey = $"{source}::{property}";
                if (!occurrenceCounter.ContainsKey(occKey)) occurrenceCounter[occKey] = 0;

                foreach (var rawToken in parts)
                {
                    var tokenCandidate = rawToken.Trim().TrimEnd(')', '(').Trim().TrimEnd(';', ',').Trim();
                    if (string.IsNullOrEmpty(tokenCandidate)) continue;
                    if (tokenCandidate.StartsWith("#", StringComparison.Ordinal) ||
                        tokenCandidate.StartsWith("rgb", StringComparison.OrdinalIgnoreCase) ||
                        tokenCandidate.StartsWith("hsl", StringComparison.OrdinalIgnoreCase) ||
                        CssColorParser.OriginalIsRgbTriple(tokenCandidate))
                        continue;

                    if (!TryParseWithSystemDrawing(tokenCandidate, out var hex)) continue;
                    occurrenceCounter[occKey]++;
                    var key = $"{source}::{property}::{selector}::{tokenCandidate}";
                    if (propsSeen.Contains(key)) continue;

                    colorList.Add(new ColorEntry
                    {
                        Source = source,
                        Property = property,
                        Selector = selector,
                        Occurrence = occurrenceCounter[occKey],
                        OriginalToken = tokenCandidate,
                        CurrentHex = hex,
                        DisplayTitle = property
                    });
                    propsSeen.Add(key);
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to extract named tokens from CSS");
        }
    }

    private static void ExtractRgbTriples(string scan, string source, List<ColorEntry> colorList, HashSet<string> propsSeen, Dictionary<string, int> occurrenceCounter)
    {
        try
        {
            var varRgbRx = new Regex(@"(?<prop>--[\w-]+)\s*:\s*(?<vals>\d{1,3}(?:\s*[,\s]\s*\d{1,3}){2})\s*;", RegexOptions.IgnoreCase | RegexOptions.Compiled);
            foreach (Match vm in varRgbRx.Matches(scan))
            {
                var prop = vm.Groups["prop"].Value.Trim();
                var vals = vm.Groups["vals"].Value.Trim();
                if (!CssColorParser.TryParseRgbTripleToHex(vals, out var hex)) continue;

                var occKey = $"{source}::{prop}";
                if (!occurrenceCounter.ContainsKey(occKey)) occurrenceCounter[occKey] = 0;
                occurrenceCounter[occKey]++;

                var selector = GetSelectorForToken(scan, vm.Index);
                var key = $"{source}::{prop}::{selector}::{vals}";
                if (propsSeen.Contains(key)) continue;

                colorList.Add(new ColorEntry
                {
                    Source = source,
                    Property = prop,
                    Selector = selector,
                    Occurrence = occurrenceCounter[occKey],
                    OriginalToken = vals,
                    CurrentHex = hex,
                    DisplayTitle = prop
                });
                propsSeen.Add(key);
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to extract RGB triples from CSS");
        }
    }

    private static void ExtractColorLiterals(string scan, string source, MatchCollection matches, List<ColorEntry> colorList, HashSet<string> propsSeen, Dictionary<string, int> occurrenceCounter)
    {
        foreach (Match m in matches)
        {
            var token = m.Value.Trim();
            if (string.IsNullOrEmpty(token)) continue;

            var property = FindCssVariableDeclarationForToken(scan, m.Index, token);
            if (string.IsNullOrEmpty(property)) property = ExtractPropertyName(scan, m.Index);
            if (string.IsNullOrEmpty(property)) property = "(unknown)";

            var selector = GetSelectorForToken(scan, m.Index);
            var key = $"{source}::{property}::{selector}::{token}";
            if (propsSeen.Contains(key)) continue;

            string hex;

            try { hex = NormalizeToHex(token); }
            catch
            {
                if (token.StartsWith("#", StringComparison.Ordinal))
                    hex = token.ToLowerInvariant();
                else
                    continue;
            }

            var occKey = $"{source}::{property}";
            if (!occurrenceCounter.ContainsKey(occKey)) occurrenceCounter[occKey] = 0;
            occurrenceCounter[occKey]++;

            colorList.Add(new ColorEntry
            {
                Source = source,
                Property = property,
                Selector = selector,
                Occurrence = occurrenceCounter[occKey],
                OriginalToken = token,
                CurrentHex = hex,
                DisplayTitle = property
            });
            propsSeen.Add(key);
        }
    }

    private static string GetSelectorForToken(string css, int tokenIndex)
    {
        try
        {
            var openBrace = css.LastIndexOf('{', Math.Max(0, tokenIndex));
            if (openBrace < 0) return string.Empty;
            var prevClose = css.LastIndexOf('}', Math.Max(0, openBrace - 1));
            var selectorStart = prevClose >= 0 ? prevClose + 1 : 0;
            var selectorLength = Math.Max(0, openBrace - selectorStart);
            var selector = css.Substring(selectorStart, selectorLength).Trim();
            selector = Regex.Replace(selector, @"\s+", " ");
            if (selector.Length > 120) selector = selector.Substring(0, 120) + "...";
            return selector;
        }
        catch { return string.Empty; }
    }

    private static string FindCssVariableDeclarationForToken(string css, int tokenIndex, string token)
    {
        var declStart = tokenIndex;
        while (declStart > 0 && css[declStart] != ';' && css[declStart] != '{' && css[declStart] != '}')
            declStart--;
        declStart = Math.Min(declStart + 1, css.Length - 1);

        var colonIndex = css.LastIndexOf(':', tokenIndex);
        if (colonIndex < 0 || colonIndex < declStart) return string.Empty;

        var i = colonIndex - 1;
        while (i >= 0 && (char.IsLetterOrDigit(css[i]) || css[i] == '-' || css[i] == '_'))
            i--;

        var propStart = i + 1;
        if (propStart >= colonIndex) return string.Empty;
        return css.Substring(propStart, colonIndex - propStart).Trim();
    }

    private static string ExtractPropertyName(string css, int tokenIndex)
    {
        var start = Math.Max(0, tokenIndex - 200);
        var length = tokenIndex - start + 1;
        if (length <= 0) return "(unknown)";
        var window = css.Substring(start, Math.Min(200, length));
        var lastColon = window.LastIndexOf(':');
        if (lastColon < 0) return "(unknown)";

        var i = lastColon - 1;
        while (i >= 0 && (char.IsLetterOrDigit(window[i]) || window[i] == '-' || window[i] == '_')) i--;
        var propStart = i + 1;
        var prop = window.Substring(propStart, lastColon - propStart).Trim();
        return string.IsNullOrEmpty(prop) ? "(unknown)" : prop;
    }

    private static string NormalizeToHex(string token)
    {
        if (CssColorParser.TryParseCssColorLiteral(token, out var hex, out _))
            return hex;
        throw new FormatException($"Unknown color format: '{token}'");
    }

    private static bool TryParseWithSystemDrawing(string token, out string hex)
    {
        return CssColorParser.TryParseCssColorLiteral(token, out hex, out var kind) && kind == CssColorKind.Named;
    }
}


