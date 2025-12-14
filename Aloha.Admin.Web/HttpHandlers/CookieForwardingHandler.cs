namespace Aloha.Admin.Web.Utilities;

public class CookieForwardingHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CookieForwardingHandler(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext?.Request.Headers.ContainsKey("Cookie") == true)
        {
            var cookies = httpContext.Request.Headers["Cookie"].ToString();
            if (!string.IsNullOrWhiteSpace(cookies))
            {
                request.Headers.Add("Cookie", cookies);
            }
        }

        return await base.SendAsync(request, cancellationToken);
    }
}



