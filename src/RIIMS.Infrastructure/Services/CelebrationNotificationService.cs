using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RIIMS.Application.DTOs.Celebration;
using RIIMS.Application.DTOs.Settings;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;

namespace RIIMS.Infrastructure.Services;

public class CelebrationNotificationService : ICelebrationNotificationService
{
    private readonly RiimsDbContext _context;
    private readonly ISystemSettingService _settingService;
    private readonly IEmailService _emailService;
    private readonly ILogger<CelebrationNotificationService> _logger;

    private static readonly TimeZoneInfo IstTimeZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");

    public CelebrationNotificationService(
        RiimsDbContext context,
        ISystemSettingService settingService,
        IEmailService emailService,
        ILogger<CelebrationNotificationService> logger)
    {
        _context = context;
        _settingService = settingService;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<CelebrationTriggerResultDto> ProcessDailyCelebrationsAsync(DateTime? targetDate = null, bool force = false)
    {
        var istNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IstTimeZone);
        var date = targetDate?.Date ?? istNow.Date;

        var settings = await _settingService.GetTypedSettingsAsync();
        var activeEmployees = await _context.Employees
            .Include(e => e.Department)
            .Include(e => e.Designation)
            .Where(e => e.IsActive)
            .ToListAsync();

        int processedCount = 0;
        var processedEvents = new List<string>();

        foreach (var emp in activeEmployees)
        {
            // 1. Birthday Wishes
            if (settings.BirthdayWishesEnabled && emp.DateOfBirth.HasValue)
            {
                var dob = emp.DateOfBirth.Value;
                if (dob.Month == date.Month && dob.Day == date.Day)
                {
                    bool processed = await ProcessCelebrationEventAsync(
                        emp,
                        "Birthday",
                        date,
                        settings.BirthdayWishesChannel,
                        settings.BirthdayWishesNotifyAllEmployees,
                        activeEmployees,
                        force: force);

                    if (processed)
                    {
                        processedCount++;
                        processedEvents.Add($"Birthday wish for {emp.Name}");
                    }
                }
            }

            // 2. Company Anniversary Wishes
            if (settings.CompanyAnniversaryWishesEnabled)
            {
                var annivBaseDate = emp.CompanyAnniversaryDate ?? emp.DateOfJoining;
                if (annivBaseDate.Month == date.Month && annivBaseDate.Day == date.Day)
                {
                    int years = date.Year - annivBaseDate.Year;
                    if (years >= 1)
                    {
                        bool processed = await ProcessCelebrationEventAsync(
                            emp,
                            "CompanyAnniversary",
                            date,
                            settings.CompanyAnniversaryWishesChannel,
                            settings.CompanyAnniversaryWishesNotifyAllEmployees,
                            activeEmployees,
                            yearsOfService: years,
                            force: force);

                        if (processed)
                        {
                            processedCount++;
                            processedEvents.Add($"{years}-Year Work Anniversary for {emp.Name}");
                        }
                    }
                }
            }

            // 3. Marriage Anniversary Wishes
            if (settings.MarriageAnniversaryWishesEnabled && emp.MarriageDate.HasValue)
            {
                var mDate = emp.MarriageDate.Value;
                if (mDate.Month == date.Month && mDate.Day == date.Day)
                {
                    bool processed = await ProcessCelebrationEventAsync(
                        emp,
                        "MarriageAnniversary",
                        date,
                        settings.MarriageAnniversaryWishesChannel,
                        settings.MarriageAnniversaryWishesNotifyAllEmployees,
                        activeEmployees,
                        force: force);

                    if (processed)
                    {
                        processedCount++;
                        processedEvents.Add($"Marriage Anniversary for {emp.Name}");
                    }
                }
            }
        }

        string msg = processedCount > 0
            ? $"Dispatched {processedCount} celebration wish(es) for {date:dd MMM yyyy}: {string.Join(", ", processedEvents)}."
            : $"Check completed for {date:dd MMM yyyy}. No active employees have a Birthday, Company Anniversary, or Marriage Anniversary matching today's date (or wishes were already dispatched earlier today).";

        return new CelebrationTriggerResultDto
        {
            Success = true,
            ProcessedCount = processedCount,
            Message = msg
        };
    }

    private async Task<bool> ProcessCelebrationEventAsync(
        Employee emp,
        string eventType,
        DateTime eventDate,
        string channel,
        bool notifyAllEmployees,
        List<Employee> allActiveEmployees,
        int? yearsOfService = null,
        bool force = false)
    {
        // Check deduplication log
        var existingLog = await _context.CelebrationLogs.FirstOrDefaultAsync(c =>
            c.EmployeeId == emp.Id &&
            c.EventType == eventType &&
            c.EventDate.Date == eventDate.Date);

        if (existingLog != null)
        {
            if (!force)
            {
                _logger.LogInformation("Celebration {EventType} for employee {EmployeeId} on {Date} already processed.", eventType, emp.Id, eventDate);
                return false;
            }
            else
            {
                // Force mode: remove previous log to re-dispatch
                _context.CelebrationLogs.Remove(existingLog);
                await _context.SaveChangesAsync();
            }
        }

        string recipientScope = notifyAllEmployees ? "AllEmployees" : "SelfAndAdmin";

        // Record log first to maintain strict idempotency
        var celebrationLog = new CelebrationLog
        {
            EmployeeId = emp.Id,
            EventType = eventType,
            EventDate = eventDate.Date,
            Channel = channel,
            RecipientScope = recipientScope,
            SentAt = DateTime.UtcNow
        };

        _context.CelebrationLogs.Add(celebrationLog);
        await _context.SaveChangesAsync();

        string title = eventType switch
        {
            "Birthday" => $"🎉 Happy Birthday, {emp.Name}!",
            "CompanyAnniversary" => $"🏆 Happy {yearsOfService} Year Work Anniversary, {emp.Name}!",
            "MarriageAnniversary" => $"💍 Happy Wedding Anniversary, {emp.Name}!",
            _ => $"🎉 Warm Wishes for {emp.Name}!"
        };

        string wishMessage = eventType switch
        {
            "Birthday" => $"Wishing {emp.Name} ({emp.Designation?.Name}) a fantastic Birthday filled with happiness and success!",
            "CompanyAnniversary" => $"Celebrating {emp.Name} ({emp.Designation?.Name}) for completing {yearsOfService} year(s) of valuable service at RIIMS!",
            "MarriageAnniversary" => $"Wishing {emp.Name} ({emp.Designation?.Name}) and their spouse a wonderful Marriage Anniversary filled with love and joy!",
            _ => $"Best wishes to {emp.Name} on this special day!"
        };

        // Handle Channel Actions
        bool sendEmail = string.Equals(channel, "Email", StringComparison.OrdinalIgnoreCase) || string.Equals(channel, "Both", StringComparison.OrdinalIgnoreCase);

        if (sendEmail)
        {
            await SendCelebrationEmailsAsync(emp, eventType, title, wishMessage, notifyAllEmployees, allActiveEmployees);
        }

        _logger.LogInformation("Successfully dispatched {EventType} wish for {EmployeeName} via channel {Channel} with scope {Scope}.", eventType, emp.Name, channel, recipientScope);
        return true;
    }

    private async Task SendCelebrationEmailsAsync(Employee emp, string eventType, string subject, string messageBody, bool notifyAll, List<Employee> allActive)
    {
        var recipients = new List<string>();

        if (notifyAll)
        {
            recipients = allActive.Select(e => e.Email).Where(e => !string.IsNullOrWhiteSpace(e)).Distinct().ToList();
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(emp.Email)) recipients.Add(emp.Email);
        }

        if (!recipients.Any()) return;

        // Theme palette based on celebration type
        string primaryColor = eventType switch
        {
            "Birthday" => "#db2777",
            "MarriageAnniversary" => "#e11d48",
            _ => "#4f46e5"
        };

        string gradientStart = eventType switch
        {
            "Birthday" => "#db2777",
            "MarriageAnniversary" => "#e11d48",
            _ => "#4f46e5"
        };

        string gradientEnd = eventType switch
        {
            "Birthday" => "#ec4899",
            "MarriageAnniversary" => "#f43f5e",
            _ => "#7c3aed"
        };

        string avatarBg = eventType switch
        {
            "Birthday" => "#fce7f3",
            "MarriageAnniversary" => "#ffe4e6",
            _ => "#e0e7ff"
        };

        string avatarBorder = eventType switch
        {
            "Birthday" => "#fbcfe8",
            "MarriageAnniversary" => "#fecdd3",
            _ => "#c7d2fe"
        };

        string cardBg = eventType switch
        {
            "Birthday" => "#fdf2f8",
            "MarriageAnniversary" => "#fff1f2",
            _ => "#f5f3ff"
        };

        string initial = !string.IsNullOrWhiteSpace(emp.Name) ? emp.Name.Substring(0, 1).ToUpper() : "E";
        string desigName = emp.Designation?.Name ?? "Team Member";
        string deptName = emp.Department?.Name ?? "RIIMS";

        string htmlTemplate = $@"<!DOCTYPE html PUBLIC ""-//W3C//DTD XHTML 1.0 Transitional//EN"" ""http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"">
<html xmlns=""http://www.w3.org/1999/xhtml"" xmlns:v=""urn:schemas-microsoft-microsoft-com:vml"" xmlns:o=""urn:schemas-microsoft-microsoft-com:office:office"">
<head>
    <meta http-equiv=""Content-Type"" content=""text/html; charset=UTF-8"" />
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
    <title>{subject}</title>
    <!--[if mso]>
    <xml>
        <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
    </xml>
    <style type=""text/css"">
        body, table, td, h1, h2, h3, p, a, span {{ font-family: 'Segoe UI', Arial, sans-serif !important; }}
    </style>
    <![endif]-->
    <style type=""text/css"">
        body {{ margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f4f5f7; }}
        table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important; }}
        img {{ -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }}
    </style>
</head>
<body style=""margin: 0; padding: 0; background-color: #f4f5f7; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;"">
    <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""background-color: #f4f5f7; table-layout: fixed;"">
        <tr>
            <td align=""center"" style=""padding: 30px 10px;"">
                <!-- 600px Main Email Container -->
                <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""600"" align=""center"" style=""max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 15px rgba(0,0,0,0.06);"">
                    
                    <!-- Header Row with VML Fallback for Outlook -->
                    <tr>
                        <td align=""center"" bgcolor=""{primaryColor}"" style=""background-color: {primaryColor}; background-image: linear-gradient(135deg, {gradientStart} 0%, {gradientEnd} 100%); padding: 0;"">
                            <!--[if mso]>
                            <v:rect xmlns:v=""urn:schemas-microsoft-microsoft-com:vml"" fill=""true"" stroke=""false"" style=""width:600px;height:120px;"">
                                <v:fill type=""gradient"" color1=""{gradientStart}"" color2=""{gradientEnd}"" angle=""135"" />
                                <v:textbox inset=""0,0,0,0"">
                            <![endif]-->
                            <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"">
                                <tr>
                                    <td align=""center"" style=""padding: 32px 24px;"">
                                        <h1 style=""margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 22px; line-height: 28px; font-weight: 800; color: #ffffff; text-align: center; letter-spacing: -0.3px;"">
                                            {subject}
                                        </h1>
                                    </td>
                                </tr>
                            </table>
                            <!--[if mso]>
                                </v:textbox>
                            </v:rect>
                            <![endif]-->
                        </td>
                    </tr>

                    <!-- Main Body Area -->
                    <tr>
                        <td align=""center"" style=""padding: 32px 28px;"">
                            <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"">
                                
                                <!-- Outlook & Webkit Avatar Circle -->
                                <tr>
                                    <td align=""center"" style=""padding-bottom: 16px;"">
                                        <table border=""0"" cellpadding=""0"" cellspacing=""0"" align=""center"">
                                            <tr>
                                                <td align=""center"" valign=""middle"">
                                                    <!--[if mso]>
                                                    <v:oval xmlns:v=""urn:schemas-microsoft-microsoft-com:vml"" fill=""true"" stroke=""true"" strokecolor=""{avatarBorder}"" style=""width:72px;height:72px;"" fillcolor=""{avatarBg}"">
                                                        <v:textbox inset=""0,0,0,0"">
                                                            <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""72"" height=""72"">
                                                                <tr>
                                                                    <td align=""center"" valign=""middle"" style=""font-size:28px;font-weight:bold;color:{primaryColor};font-family:'Segoe UI',Arial,sans-serif;"">
                                                                        {initial}
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </v:textbox>
                                                    </v:oval>
                                                    <![endif]-->
                                                    <!--[if !mso]><!-->
                                                    <div style=""width: 72px; height: 72px; border-radius: 50%; background-color: {avatarBg}; color: {primaryColor}; border: 2px solid {avatarBorder}; line-height: 68px; font-size: 28px; font-weight: bold; text-align: center; margin: 0 auto;"">
                                                        {initial}
                                                    </div>
                                                    <!--<![endif]-->
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Employee Name & Designation -->
                                <tr>
                                    <td align=""center"" style=""padding-bottom: 24px;"">
                                        <h2 style=""margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 20px; line-height: 26px; font-weight: 700; color: #111827; text-align: center;"">
                                            {emp.Name}
                                        </h2>
                                        <p style=""margin: 4px 0 0 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; line-height: 20px; color: #6b7280; text-align: center;"">
                                            {desigName} &bull; {deptName}
                                        </p>
                                    </td>
                                </tr>

                                <!-- Highlighted Message Card -->
                                <tr>
                                    <td style=""padding-bottom: 24px;"">
                                        <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""background-color: {cardBg}; border-left: 4px solid {primaryColor}; border-radius: 6px;"">
                                            <tr>
                                                <td style=""padding: 18px 20px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 24px; color: #374151;"">
                                                    {messageBody}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Warm Closing Message -->
                                <tr>
                                    <td align=""center"" style=""padding-bottom: 8px;"">
                                        <p style=""margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; line-height: 22px; color: #6b7280; text-align: center;"">
                                            Join us in extending our warmest wishes! 🎉✨
                                        </p>
                                    </td>
                                </tr>

                            </table>
                        </td>
                    </tr>

                    <!-- Footer Row -->
                    <tr>
                        <td align=""center"" bgcolor=""#f9fafb"" style=""background-color: #f9fafb; padding: 18px 24px; border-top: 1px solid #f3f4f6;"">
                            <p style=""margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; line-height: 16px; color: #9ca3af; text-align: center;"">
                                RIIMS V2 Employee Engagement & Celebration System
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>";

        foreach (var email in recipients)
        {
            try
            {
                await _emailService.SendEmailAsync(email, subject, htmlTemplate);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send celebration email to {Email}", email);
            }
        }
    }

    public async Task<List<CelebrationFeedDto>> GetTodayCelebrationsAsync()
    {
        var istNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IstTimeZone);
        var date = istNow.Date;

        var logsToday = await _context.CelebrationLogs
            .Include(c => c.Employee)
                .ThenInclude(e => e.Department)
            .Include(c => c.Employee)
                .ThenInclude(e => e.Designation)
            .Where(c => c.EventDate.Date == date)
            .OrderByDescending(c => c.SentAt)
            .ToListAsync();

        var result = new List<CelebrationFeedDto>();

        foreach (var log in logsToday)
        {
            var emp = log.Employee;
            if (emp == null || !emp.IsActive) continue;

            int? yearsOfService = null;
            if (log.EventType == "CompanyAnniversary")
            {
                var annivDate = emp.CompanyAnniversaryDate ?? emp.DateOfJoining;
                yearsOfService = date.Year - annivDate.Year;
            }

            string title = log.EventType switch
            {
                "Birthday" => $"🎉 Birthday Celebration",
                "CompanyAnniversary" => $"🏆 {yearsOfService} Year Work Anniversary",
                "MarriageAnniversary" => $"💍 Marriage Anniversary",
                _ => $"🎉 Celebration Wish"
            };

            string message = log.EventType switch
            {
                "Birthday" => $"Wishing {emp.Name} a fabulous Birthday!",
                "CompanyAnniversary" => $"Congratulating {emp.Name} on {yearsOfService} year(s) with the team!",
                "MarriageAnniversary" => $"Wishing {emp.Name} a happy Wedding Anniversary!",
                _ => $"Warm wishes for {emp.Name}!"
            };

            result.Add(new CelebrationFeedDto
            {
                EmployeeId = emp.Id,
                EmployeeName = emp.Name,
                EventType = log.EventType,
                Title = title,
                Message = message,
                EventDate = log.EventDate,
                DesignationName = emp.Designation?.Name ?? "Employee",
                DepartmentName = emp.Department?.Name ?? "General",
                YearsOfService = yearsOfService,
                IsToday = true
            });
        }

        return result;
    }
}
