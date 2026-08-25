using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using RIIMS.Application.Common;
using RIIMS.Application.Exceptions;

namespace RIIMS.API.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IWebHostEnvironment _env;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger,
        IWebHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var traceId = context.TraceIdentifier;
            _logger.LogError(ex, "Unhandled exception [TraceId: {TraceId}]: {Message}", traceId, ex.Message);
            await HandleExceptionAsync(context, ex, traceId);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception, string traceId)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, message) = exception switch
        {
            ConflictException => (HttpStatusCode.Conflict, exception.Message),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, exception.Message),
            KeyNotFoundException => (HttpStatusCode.NotFound, exception.Message),
            InvalidOperationException => (HttpStatusCode.BadRequest, exception.Message),
            ArgumentNullException => (HttpStatusCode.BadRequest, "A required request parameter or body property was missing."),
            ArgumentException => (HttpStatusCode.BadRequest, exception.Message),
            FormatException => (HttpStatusCode.BadRequest, "Invalid date, time, or numeric format in request."),
            JsonException => (HttpStatusCode.BadRequest, "Malformed JSON request body."),
            _ => (HttpStatusCode.InternalServerError, "An unexpected internal server error occurred.")
        };

        context.Response.StatusCode = (int)statusCode;

        List<string> errors;
        string userMessage;

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            userMessage = "An unexpected error occurred while processing your request.";
            errors = new List<string>
            {
                $"Reference Trace ID: {traceId}. Please contact technical support if this issue persists."
            };

            // In local development only, append debug stack info for developer convenience
            if (_env.IsDevelopment())
            {
                errors.Add($"Debug Info: {exception.Message}");
                if (exception.InnerException != null)
                {
                    errors.Add($"Inner Exception: {exception.InnerException.Message}");
                }
            }
        }
        else
        {
            userMessage = message;
            errors = new List<string> { message };
            if (exception.InnerException != null && _env.IsDevelopment())
            {
                errors.Add(exception.InnerException.Message);
            }
        }

        var response = ApiResponse.FailResponse(userMessage, errors);

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}
