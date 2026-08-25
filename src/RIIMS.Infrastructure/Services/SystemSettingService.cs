using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Settings;
using RIIMS.Application.Interfaces;
using RIIMS.Infrastructure.Data;

namespace RIIMS.Infrastructure.Services;

public class SystemSettingService : ISystemSettingService
{
    private readonly RiimsDbContext _context;

    public SystemSettingService(RiimsDbContext context)
    {
        _context = context;
    }

    public async Task<List<SystemSettingDto>> GetAllAsync()
    {
        return await _context.SystemSettings
            .Select(s => new SystemSettingDto
            {
                Id = s.Id,
                Key = s.Key,
                Value = s.Value,
                Description = s.Description
            })
            .ToListAsync();
    }

    public async Task<TypedSystemSettingsDto> GetTypedSettingsAsync()
    {
        var settingsList = await _context.SystemSettings.ToListAsync();
        var settings = settingsList.ToDictionary(s => s.Key, s => s.Value, StringComparer.OrdinalIgnoreCase);

        var result = new TypedSystemSettingsDto();

        if (settings.TryGetValue("OfficeStartTime", out var startTimeVal))
        {
            result.OfficeStartTimeDisplay = startTimeVal;
            if (TimeSpan.TryParse(startTimeVal, out var parsedStart))
            {
                result.OfficeStartTime = parsedStart;
            }
            else if (DateTime.TryParse(startTimeVal, out var dtStart))
            {
                result.OfficeStartTime = dtStart.TimeOfDay;
            }
        }

        if (settings.TryGetValue("OfficeEndTime", out var endTimeVal))
        {
            result.OfficeEndTimeDisplay = endTimeVal;
            if (TimeSpan.TryParse(endTimeVal, out var parsedEnd))
            {
                result.OfficeEndTime = parsedEnd;
            }
            else if (DateTime.TryParse(endTimeVal, out var dtEnd))
            {
                result.OfficeEndTime = dtEnd.TimeOfDay;
            }
        }

        if (settings.TryGetValue("SecondHalfStartTime", out var secondStartVal))
        {
            result.SecondHalfStartTimeDisplay = secondStartVal;
            if (TimeSpan.TryParse(secondStartVal, out var parsedSecond))
            {
                result.SecondHalfStartTime = parsedSecond;
            }
            else if (DateTime.TryParse(secondStartVal, out var dtSecond))
            {
                result.SecondHalfStartTime = dtSecond.TimeOfDay;
            }
        }

        if (settings.TryGetValue("GraceMinutes", out var graceVal) && int.TryParse(graceVal, out var graceParsed))
        {
            result.GraceMinutes = graceParsed;
        }

        if (settings.TryGetValue("PermissionHours", out var permVal) && decimal.TryParse(permVal, out var permParsed))
        {
            result.PermissionHours = permParsed;
        }

        if (settings.TryGetValue("MonthlyAllowedPermissions", out var permCountVal) && int.TryParse(permCountVal, out var permCountParsed) && permCountParsed >= 0)
        {
            result.MonthlyAllowedPermissions = permCountParsed;
        }
        else
        {
            result.MonthlyAllowedPermissions = (int)Math.Max(1, result.PermissionHours);
        }

        if (settings.TryGetValue("LateLoginsForHalfDay", out var lateVal) && int.TryParse(lateVal, out var lateParsed))
        {
            result.LateLoginsForHalfDay = lateParsed;
        }

        if (settings.TryGetValue("MonthlyAllowedLeave", out var leaveVal) && int.TryParse(leaveVal, out var leaveParsed) && leaveParsed >= 0)
        {
            result.MonthlyAllowedLeave = leaveParsed;
        }

        // Celebration Settings
        if (settings.TryGetValue("BirthdayWishesEnabled", out var bdayEnVal) && bool.TryParse(bdayEnVal, out var bdayEnParsed))
            result.BirthdayWishesEnabled = bdayEnParsed;
        if (settings.TryGetValue("BirthdayWishesChannel", out var bdayChVal) && !string.IsNullOrWhiteSpace(bdayChVal))
            result.BirthdayWishesChannel = bdayChVal;
        if (settings.TryGetValue("BirthdayWishesNotifyAllEmployees", out var bdayAllVal) && bool.TryParse(bdayAllVal, out var bdayAllParsed))
            result.BirthdayWishesNotifyAllEmployees = bdayAllParsed;

        if (settings.TryGetValue("CompanyAnniversaryWishesEnabled", out var compEnVal) && bool.TryParse(compEnVal, out var compEnParsed))
            result.CompanyAnniversaryWishesEnabled = compEnParsed;
        if (settings.TryGetValue("CompanyAnniversaryWishesChannel", out var compChVal) && !string.IsNullOrWhiteSpace(compChVal))
            result.CompanyAnniversaryWishesChannel = compChVal;
        if (settings.TryGetValue("CompanyAnniversaryWishesNotifyAllEmployees", out var compAllVal) && bool.TryParse(compAllVal, out var compAllParsed))
            result.CompanyAnniversaryWishesNotifyAllEmployees = compAllParsed;

        if (settings.TryGetValue("MarriageAnniversaryWishesEnabled", out var marrEnVal) && bool.TryParse(marrEnVal, out var marrEnParsed))
            result.MarriageAnniversaryWishesEnabled = marrEnParsed;
        if (settings.TryGetValue("MarriageAnniversaryWishesChannel", out var marrChVal) && !string.IsNullOrWhiteSpace(marrChVal))
            result.MarriageAnniversaryWishesChannel = marrChVal;
        if (settings.TryGetValue("MarriageAnniversaryWishesNotifyAllEmployees", out var marrAllVal) && bool.TryParse(marrAllVal, out var marrAllParsed))
            result.MarriageAnniversaryWishesNotifyAllEmployees = marrAllParsed;

        return result;
    }

    public async Task<SystemSettingDto?> GetByKeyAsync(string key)
    {
        var setting = await _context.SystemSettings
            .FirstOrDefaultAsync(s => s.Key == key);

        if (setting == null) return null;

        return new SystemSettingDto
        {
            Id = setting.Id,
            Key = setting.Key,
            Value = setting.Value,
            Description = setting.Description
        };
    }

    public async Task<SystemSettingDto> UpdateAsync(string key, UpdateSettingRequest request)
    {
        var setting = await _context.SystemSettings
            .FirstOrDefaultAsync(s => s.Key == key);

        if (setting == null)
            throw new KeyNotFoundException($"Setting '{key}' not found.");

        setting.Value = request.Value;
        await _context.SaveChangesAsync();

        if (key.Equals("OfficeEndTime", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                TimeSpan newOfficeEnd;
                if (TimeSpan.TryParse(request.Value, out var parsedSpan))
                {
                    newOfficeEnd = parsedSpan;
                }
                else if (DateTime.TryParse(request.Value, out var parsedDt))
                {
                    newOfficeEnd = parsedDt.TimeOfDay;
                }
                else
                {
                    newOfficeEnd = new TimeSpan(19, 0, 0);
                }

                TimeZoneInfo istTz;
                try { istTz = TimeZoneInfo.FindSystemTimeZoneById("Indian Standard Time"); }
                catch { istTz = TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata"); }

                var nowUtc = DateTime.UtcNow;
                var nowIst = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, istTz);
                var todayWorkDate = DateOnly.FromDateTime(nowIst);
                var newOfficeEndIst = nowIst.Date.Add(newOfficeEnd);
                var newOfficeEndUtc = TimeZoneInfo.ConvertTimeToUtc(newOfficeEndIst, istTz);

                var activeSessions = await _context.EmployeeSessions
                    .Where(s => s.IsActive && s.WorkDate == todayWorkDate)
                    .ToListAsync();

                foreach (var s in activeSessions)
                {
                    s.AllowedEndTime = newOfficeEndUtc;
                }

                var todayLogs = await _context.AttendanceLogs
                    .Where(a => a.LogoutTime == null)
                    .ToListAsync();

                foreach (var a in todayLogs)
                {
                    if (TimeZoneInfo.ConvertTimeFromUtc(a.LoginTime, istTz).Date == nowIst.Date)
                    {
                        a.AllowedEndTime = newOfficeEndUtc;
                    }
                }

                await _context.SaveChangesAsync();
            }
            catch
            {
                // Non-blocking fallback
            }
        }

        return new SystemSettingDto
        {
            Id = setting.Id,
            Key = setting.Key,
            Value = setting.Value,
            Description = setting.Description
        };
    }
}
