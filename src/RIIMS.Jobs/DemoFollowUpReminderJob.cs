using Microsoft.EntityFrameworkCore;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;

namespace RIIMS.Jobs;

public class DemoFollowUpReminderJob
{
    private readonly RiimsDbContext _context;
    private readonly IEmailService _emailService;

    public DemoFollowUpReminderJob(RiimsDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    public async Task ExecuteAsync()
    {
        var today = DateTime.UtcNow.Date;

        var pendingReminders = await _context.DemoFollowUps
            .Include(d => d.Employee)
            .Include(d => d.Product)
            .Include(d => d.Client)
            .Where(d => d.FollowUpDate <= today && d.Status == DemoFollowUpStatus.Pending)
            .ToListAsync();

        foreach (var item in pendingReminders)
        {
            try
            {
                if (item.Employee == null || string.IsNullOrEmpty(item.Employee.Email)) continue;

                var subject = $"RIMS — Demo Follow-Up Reminder ({item.Product?.Name} - {item.Client?.CompanyName})";
                var htmlBody = $@"
                <div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;"">
                    <div style=""background: #2563eb; color: #ffffff; padding: 20px; text-align: center;"">
                        <h2 style=""margin: 0;"">Demo Follow-Up Reminder</h2>
                        <p style=""margin: 5px 0 0 0; font-size: 14px;"">Scheduled Action Required Today</p>
                    </div>
                    <div style=""padding: 25px; color: #1e293b;"">
                        <p style=""font-size: 16px;"">Hello <strong>{item.Employee.Name}</strong>,</p>
                        <p>This is your scheduled follow-up reminder for the Demo conducted previously.</p>

                        <div style=""background: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px;"">
                            <p style=""margin: 0 0 8px 0;""><strong>Product Name:</strong> <span style=""color: #2563eb; font-weight: bold;"">{item.Product?.Name}</span></p>
                            <p style=""margin: 0 0 8px 0;""><strong>Client Name:</strong> {item.Client?.CompanyName}</p>
                            <p style=""margin: 0 0 8px 0;""><strong>Scheduled Follow-Up Date:</strong> {item.FollowUpDate:yyyy-MM-dd}</p>
                            <p style=""margin: 0;""><strong>Review / Remarks:</strong> ""{item.ReviewRemarks}""</p>
                        </div>

                        <div style=""text-align: center; margin-top: 30px;"">
                            <a href=""http://localhost:3000/work-task"" style=""background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;"">Open Portal to Complete</a>
                        </div>
                    </div>
                    <div style=""background: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;"">
                        RIMS Notification System
                    </div>
                </div>";

                await _emailService.SendEmailAsync(item.Employee.Email, subject, htmlBody);

                item.Status = DemoFollowUpStatus.ReminderSent;
                item.ReminderSentAt = DateTime.UtcNow;
            }
            catch
            {
                // Continue with next item
            }
        }

        await _context.SaveChangesAsync();
    }
}
