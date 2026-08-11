using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RIIMS.Domain.Common;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Identity;

namespace RIIMS.Infrastructure.Data;

public class RiimsDbContext : IdentityDbContext<ApplicationUser, IdentityRole<int>, int>
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

    // Time Tracking
    public DbSet<WorkTask> WorkTasks => Set<WorkTask>();
    public DbSet<TaskTimeLog> TaskTimeLogs => Set<TaskTimeLog>();
    public DbSet<AttendanceLog> AttendanceLogs => Set<AttendanceLog>();
    public DbSet<BreakLog> BreakLogs => Set<BreakLog>();
    public DbSet<SupportActivityLog> SupportActivityLogs => Set<SupportActivityLog>();
    public DbSet<DemoFollowUp> DemoFollowUps => Set<DemoFollowUp>();
    public DbSet<ActivityTimeline> ActivityTimelines => Set<ActivityTimeline>();

    // Leave / Permission
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<PermissionRequest> PermissionRequests => Set<PermissionRequest>();

    // Payroll
    public DbSet<GraceTimeViolation> GraceTimeViolations => Set<GraceTimeViolation>();
    public DbSet<LOPCalculation> LOPCalculations => Set<LOPCalculation>();
    public DbSet<PayslipDetail> PayslipDetails => Set<PayslipDetail>();

    // Reports
    public DbSet<MonthlyReportLog> MonthlyReportLogs => Set<MonthlyReportLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Apply all IEntityTypeConfiguration classes from this assembly
        builder.ApplyConfigurationsFromAssembly(typeof(RiimsDbContext).Assembly);

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
