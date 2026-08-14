using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using RIIMS.Application.Common;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Middleware;

public class SessionValidationMiddleware
{
    private readonly RequestDelegate _next;

    public SessionValidationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ISessionService sessionService)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? string.Empty;

        // Skip public auth endpoints & swagger
        if (path.Contains("/auth/login") || path.Contains("/swagger"))
        {
            await _next(context);
            return;
        }

        if (context.User.Identity?.IsAuthenticated == true)
        {
            var sessionIdStr = context.User.FindFirst("sessionId")?.Value;
            var jtiStr = context.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;

            if (Guid.TryParse(sessionIdStr, out var sessionId) && !string.IsNullOrEmpty(jtiStr))
            {
                var isValid = await sessionService.ValidateSessionAsync(sessionId, jtiStr);
                if (!isValid)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(ApiResponse.FailResponse("Session has expired or belongs to a previous workday. Please log in again."));
                    return;
                }
            }
        }

        await _next(context);
    }
}
