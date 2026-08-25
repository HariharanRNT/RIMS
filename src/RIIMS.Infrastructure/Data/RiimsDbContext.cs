using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RIIMS.Domain.Common;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Identity;

namespace RIIMS.Infrastructure.Data;

public class RiimsDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, int>
{
    public RiimsDbContext(DbContextOptions<RiimsDbContext> options) : base(options)
    {
    }

    // Master Data
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Designation> Designations => Set<Designation>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<ProductClientMapping> ProductClientMappings => Set<ProductClientMapping>();
    public DbSet<BreakType> BreakTypes => Set<BreakType>();
    public DbSet<SupportActivityType> SupportActivityTypes => Set<SupportActivityType>();
    public DbSet<LeaveType> LeaveTypes => Set<LeaveType>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();

    // Employee
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<EmployeeWorkDetail> EmployeeWorkDetails => Set<EmployeeWorkDetail>();
    public DbSet<EmployeeSession> EmployeeSessions => Set<EmployeeSession>();

    // Time Tracking
    public DbSet<WorkTask> WorkTasks => Set<WorkTask>();
    public DbSet<TaskTimeLog> TaskTimeLogs => Set<TaskTimeLog>();
    public DbSet<TaskTimelineEvent> TaskTimelineEvents => Set<TaskTimelineEvent>();
    public DbSet<AttendanceLog> AttendanceLogs => Set<AttendanceLog>();
    public DbSet<BreakLog> BreakLogs => Set<BreakLog>();
    public DbSet<SupportActivityLog> SupportActivityLogs => Set<SupportActivityLog>();
    public DbSet<IdleTimeLog> IdleTimeLogs => Set<IdleTimeLog>();
    public DbSet<DemoFollowUp> DemoFollowUps => Set<DemoFollowUp>();
    public DbSet<ActivityTimeline> ActivityTimelines => Set<ActivityTimeline>();
    public DbSet<AttendanceCalendar> AttendanceCalendars => Set<AttendanceCalendar>();
    public DbSet<AttendanceCalendarAudit> AttendanceCalendarAudits => Set<AttendanceCalendarAudit>();

    // Leave / Permission
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<PermissionRequest> PermissionRequests => Set<PermissionRequest>();

    // Payroll
    public DbSet<GraceTimeViolation> GraceTimeViolations => Set<GraceTimeViolation>();
    public DbSet<LOPCalculation> LOPCalculations => Set<LOPCalculation>();
    public DbSet<PayslipDetail> PayslipDetails => Set<PayslipDetail>();
    public DbSet<EmployeeSalaryStructure> EmployeeSalaryStructures => Set<EmployeeSalaryStructure>();
    public DbSet<SalaryComponent> SalaryComponents => Set<SalaryComponent>();

    // Auth, Identity & RBAC
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<AdminNotificationRead> AdminNotificationReads => Set<AdminNotificationRead>();
    public DbSet<CelebrationLog> CelebrationLogs => Set<CelebrationLog>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();

    // Reports
    public DbSet<MonthlyReportLog> MonthlyReportLogs => Set<MonthlyReportLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Apply all IEntityTypeConfiguration classes from this assembly
        builder.ApplyConfigurationsFromAssembly(typeof(RiimsDbContext).Assembly);

        builder.Entity<Permission>(entity =>
        {
            entity.HasIndex(p => p.Code).IsUnique();
            entity.Property(p => p.Name).HasMaxLength(150).IsRequired();
            entity.Property(p => p.Code).HasMaxLength(100).IsRequired();
            entity.Property(p => p.Module).HasMaxLength(100).IsRequired();
            entity.Property(p => p.Description).HasMaxLength(500);
        });

        builder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(rp => new { rp.RoleId, rp.PermissionId });

            entity.HasOne<ApplicationRole>()
                .WithMany(r => r.RolePermissions)
                .HasForeignKey(rp => rp.RoleId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(rp => rp.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(rp => rp.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<CelebrationLog>(entity =>
        {
            entity.HasIndex(c => new { c.EmployeeId, c.EventType, c.EventDate }).IsUnique();
        });

        builder.Entity<AdminNotificationRead>(entity =>
        {
            entity.HasIndex(n => new { n.AdminUserId, n.NotificationKey });
        });

        builder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasIndex(t => new { t.TokenHash, t.IsUsed, t.ExpiresAt });
            entity.HasIndex(t => new { t.UserId, t.IsUsed });
        });

        builder.Entity<EmployeeSession>(entity =>
        {
            entity.HasIndex(e => e.SessionId).IsUnique();
            entity.HasIndex(e => e.TokenJti);
            entity.HasIndex(e => new { e.EmployeeId, e.IsActive, e.WorkDate });
        });

        builder.Entity<WorkTask>(entity =>
        {
            entity.HasOne(t => t.AssignedByEmployee)
                .WithMany()
                .HasForeignKey(t => t.AssignedByEmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(t => new { t.EmployeeId, t.Status, t.Priority, t.CreatedAt });
            entity.HasIndex(t => t.AssignedByEmployeeId);
            entity.HasIndex(t => t.DueDate);
        });

        builder.Entity<TaskTimelineEvent>(entity =>
        {
            entity.HasOne(e => e.WorkTask)
                .WithMany(t => t.TimelineEvents)
                .HasForeignKey(e => e.WorkTaskId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.PerformedByEmployee)
                .WithMany()
                .HasForeignKey(e => e.PerformedByEmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Global query filter for soft delete on all BaseEntity-derived entities
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                var method = typeof(RiimsDbContext)
                    .GetMethod(nameof(ApplySoftDeleteFilter),
                        System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!
                    .MakeGenericMethod(entityType.ClrType);
                method.Invoke(null, new object[] { builder });
            }
        }
    }

    private static void ApplySoftDeleteFilter<T>(ModelBuilder builder) where T : BaseEntity
    {
        builder.Entity<T>().HasQueryFilter(e => e.IsActive);
    }

    public override int SaveChanges()
    {
        ApplyAuditInfo();
        return base.SaveChanges();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditInfo();
        return await base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyAuditInfo()
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = now;
                    entry.Entity.UpdatedAt = now;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    break;
            }
        }
    }
}
