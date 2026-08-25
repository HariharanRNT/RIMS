using RIIMS.Application.DTOs.Support;

namespace RIIMS.Application.Interfaces;

public interface ISupportActivityService
{
    Task<SupportLogDto> StartSupportAsync(int employeeId, StartSupportRequest request);
    Task<SupportLogDto> StopSupportAsync(int supportLogId, int employeeId, StopSupportRequest request);
    Task<SupportLogDto?> GetActiveSupportAsync(int employeeId);
    Task<DemoFollowUpDto> CompleteDemoAsync(int employeeId, CompleteDemoRequest request);
    Task<List<DemoFollowUpDto>> GetMyPendingDemoFollowUpsAsync(int employeeId);
    Task CompleteDemoFollowUpAsync(int followUpId, int employeeId);
    Task CompleteAllDemoFollowUpsAsync(int employeeId);
}
