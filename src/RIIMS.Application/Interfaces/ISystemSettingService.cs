using RIIMS.Application.DTOs.Settings;

namespace RIIMS.Application.Interfaces;

public interface ISystemSettingService
{
    Task<List<SystemSettingDto>> GetAllAsync();
    Task<TypedSystemSettingsDto> GetTypedSettingsAsync();
    Task<SystemSettingDto?> GetByKeyAsync(string key);
    Task<SystemSettingDto> UpdateAsync(string key, UpdateSettingRequest request);
}
