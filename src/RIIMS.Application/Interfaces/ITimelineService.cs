using RIIMS.Application.DTOs.Timeline;

namespace RIIMS.Application.Interfaces;

public interface ITimelineService
{
    Task<List<ActivityTimelineDto>> GetTimelineAsync(int employeeId, DateTime date);
}
