using RIIMS.Application.DTOs.Session;

namespace RIIMS.Application.Interfaces;

public interface ISessionService
{
    Task<(Guid SessionId, string TokenJti)> CreateSessionAsync(int employeeId, string? deviceInfo = null);
    Task<bool> ValidateSessionAsync(Guid sessionId, string tokenJti);
    Task UpdateHeartbeatAsync(Guid sessionId);
    Task InvalidateEmployeeSessionsAsync(int employeeId);
    Task<CurrentServerStateDto> GetCurrentServerStateAsync(int employeeId);
    Task PerformWorkdayEodCleanupAsync();
}
