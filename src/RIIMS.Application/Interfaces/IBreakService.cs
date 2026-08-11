using RIIMS.Application.DTOs.Break;

namespace RIIMS.Application.Interfaces;

public interface IBreakService
{
    Task<BreakLogDto> StartBreakAsync(int employeeId, StartBreakRequest request);
    Task<BreakLogDto> StopBreakAsync(int breakLogId, int employeeId);
    Task<BreakLogDto?> GetActiveBreakAsync(int employeeId);
}
