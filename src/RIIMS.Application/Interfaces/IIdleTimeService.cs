using RIIMS.Application.DTOs.IdleTime;

namespace RIIMS.Application.Interfaces;

public interface IIdleTimeService
{
    Task OnPunchInAsync(int employeeId, DateTime loginTime);
    Task OnPunchOutAsync(int employeeId, DateTime logoutTime);
    Task OnActivityStartingAsync(int employeeId, DateTime activityStartTime, string activityType);
    Task OnActivityEndingAsync(int employeeId, DateTime activityEndTime, string sourceActivityType);
    Task<EmployeeCurrentStateDto> GetCurrentStateAsync(int employeeId);
}
