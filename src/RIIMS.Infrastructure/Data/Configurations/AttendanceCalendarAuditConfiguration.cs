using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class AttendanceCalendarAuditConfiguration : IEntityTypeConfiguration<AttendanceCalendarAudit>
{
    public void Configure(EntityTypeBuilder<AttendanceCalendarAudit> builder)
    {
        builder.ToTable("AttendanceCalendarAudits");

        builder.HasIndex(a => a.CalendarDate)
            .HasDatabaseName("IX_AttendanceCalendarAudit_CalendarDate");

        builder.HasIndex(a => a.ChangedAt)
            .HasDatabaseName("IX_AttendanceCalendarAudit_ChangedAt");

        builder.Property(a => a.ReasonForChange)
            .IsRequired()
            .HasMaxLength(500);

        builder.HasOne(a => a.AttendanceCalendar)
            .WithMany(c => c.AuditLogs)
            .HasForeignKey(a => a.AttendanceCalendarId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
