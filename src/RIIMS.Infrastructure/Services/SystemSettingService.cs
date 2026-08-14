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

        if (settings.TryGetValue("GraceMinutes", out var graceVal) && int.TryParse(graceVal, out var graceParsed))
        {
            result.GraceMinutes = graceParsed;
        }

        if (settings.TryGetValue("PermissionHours", out var permVal) && decimal.TryParse(permVal, out var permParsed))
        {
            result.PermissionHours = permParsed;
        }

        if (settings.TryGetValue("LateLoginsForHalfDay", out var lateVal) && int.TryParse(lateVal, out var lateParsed))
        {
            result.LateLoginsForHalfDay = lateParsed;
        }

        if (settings.TryGetValue("MonthlyAllowedLeave", out var leaveVal) && int.TryParse(leaveVal, out var leaveParsed) && leaveParsed >= 0)
        {
            result.MonthlyAllowedLeave = leaveParsed;
        }

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

        return new SystemSettingDto
        {
            Id = setting.Id,
            Key = setting.Key,
            Value = setting.Value,
            Description = setting.Description
        };
    }
}
