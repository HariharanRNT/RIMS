using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using RIIMS.Application.DTOs.Celebration;

namespace RIIMS.Application.Interfaces;

public interface ICelebrationNotificationService
{
    Task<CelebrationTriggerResultDto> ProcessDailyCelebrationsAsync(DateTime? targetDate = null, bool force = false);
    Task<List<CelebrationFeedDto>> GetTodayCelebrationsAsync();
}
