using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class AttendanceLogConfiguration : IEntityTypeConfiguration<AttendanceLog>
{
    public void Configure(EntityTypeBuilder<AttendanceLog> builder)
    {
        builder.ToTable("AttendanceLogs");

        // WorkDate: IST calendar date of the login — stored as DATE, not nullable
        builder.Property(a => a.WorkDate)
            .IsRequired()
            .HasColumnType("date");

        builder.HasIndex(a => new { a.EmployeeId, a.LoginTime })
            .HasDatabaseName("IX_AttendanceLog_EmployeeId_LoginTime");

        // ─────────────────────────────────────────────────────────────────────
        // BUG-024 FIX: Unique filtered index — prevents duplicate OPEN
        // AttendanceLogs for the same employee on the same IST work-day.
        //
        // A filtered index (WHERE LogoutTime IS NULL) allows multiple CLOSED
        // records per day (normal for same-day re-logins) while ensuring only
        // ONE record can be open (LogoutTime = NULL) at any given time.
        //
        // The database will raise a unique constraint violation if a second
        // concurrent INSERT tries to create a second open record, which EF Core
        // will surface as a DbUpdateException — caught in AttendanceService and
        // returned to the caller as an idempotent no-op.
        // ─────────────────────────────────────────────────────────────────────
        builder.HasIndex(a => new { a.EmployeeId, a.WorkDate })
            .HasDatabaseName("UX_AttendanceLog_OpenPerDay")
            .HasFilter("[LogoutTime] IS NULL")
            .IsUnique();

        builder.HasOne(a => a.Employee)
            .WithMany(e => e.AttendanceLogs)
            .HasForeignKey(a => a.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
