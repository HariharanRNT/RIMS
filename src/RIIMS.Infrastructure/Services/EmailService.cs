using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RIIMS.Application.Interfaces;

namespace RIIMS.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendEmailAsync(string to, string subject, string body, string? cc = null)
    {
        var smtpSettings = _configuration.GetSection("Smtp");
        var host = smtpSettings["Host"] ?? "localhost";
        var port = int.Parse(smtpSettings["Port"] ?? "587");
        var username = smtpSettings["Username"] ?? "";
        var password = smtpSettings["Password"] ?? "";
        var from = smtpSettings["From"] ?? "noreply@riims.local";
        var enableSsl = bool.Parse(smtpSettings["EnableSsl"] ?? "false");

        _logger.LogInformation("Attempting to send email to {To} (CC: {CC}) with Subject: '{Subject}'", to, cc ?? "None", subject);

        try
        {
            using var client = new SmtpClient(host, port)
            {
                Credentials = new NetworkCredential(username, password),
                EnableSsl = enableSsl,
                Timeout = 10000 // 10 second timeout
            };

            var message = new MailMessage(from, to, subject, body)
            {
                IsBodyHtml = body.Contains("<html") || body.Contains("<div") || body.Contains("<p>")
            };

            if (!string.IsNullOrWhiteSpace(cc))
            {
                message.CC.Add(cc.Trim());
            }

            await client.SendMailAsync(message);
            _logger.LogInformation("Email successfully dispatched to {To} (CC: {CC}) via SMTP {Host}:{Port}", to, cc ?? "None", host, port);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SMTP dispatch failed ({Host}:{Port}). Logging email contents to console for local dev:\nTO: {To}\nCC: {CC}\nSUBJECT: {Subject}\nBODY:\n{Body}",
                host, port, to, cc ?? "None", subject, body);
        }
    }
}
