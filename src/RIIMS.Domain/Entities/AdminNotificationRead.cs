using System;
using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class AdminNotificationRead : BaseEntity
{
    public int AdminUserId { get; set; }
    public string NotificationKey { get; set; } = string.Empty;
    public DateTime ReadAt { get; set; } = DateTime.UtcNow;
}
