using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Timeline;
using RIIMS.Application.Interfaces;
using RIIMS.Infrastructure.Data;

namespace RIIMS.Infrastructure.Services;

public class TimelineService : ITimelineService
{
    private readonly RiimsDbContext _context;

    public TimelineService(RiimsDbContext context)
    {
        _context = context;
    }

    public async Task<List<ActivityTimelineDto>> GetTimelineAsync(int employeeId, DateTime date)
    {
        var targetDate = date.Date;
        var nextDate = targetDate.AddDays(1);

        var items = await _context.ActivityTimelines
            .Where(a => a.EmployeeId == employeeId && a.StartTime >= targetDate && a.StartTime < nextDate)
            .OrderBy(a => a.StartTime)
            .ToListAsync();

        return items.Select(a =>
        {
            var duration = a.EndTime.HasValue
                ? (a.EndTime.Value - a.StartTime).ToString(@"hh\:mm\:ss")
                : null;

            return new ActivityTimelineDto
            {
                Id = a.Id,
                EmployeeId = a.EmployeeId,
                ActivityType = a.ActivityType,
                RefTable = a.RefTable,
                RefId = a.RefId,
                StartTime = a.StartTime,
                EndTime = a.EndTime,
                Status = a.Status,
                Remarks = a.Remarks,
                Duration = duration
            };
        }).ToList();
    }
}
