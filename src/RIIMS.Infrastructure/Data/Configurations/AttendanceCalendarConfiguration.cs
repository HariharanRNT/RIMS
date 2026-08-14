using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class AttendanceCalendarConfiguration : IEntityTypeConfiguration<AttendanceCalendar>
{
    public void Configure(EntityTypeBuilder<AttendanceCalendar> builder)
    {
        builder.ToTable("AttendanceCalendars");

        builder.HasIndex(c => c.CalendarDate)
            .IsUnique()
            .HasDatabaseName("IX_AttendanceCalendar_CalendarDate");

        builder.HasIndex(c => new { c.Year, c.Month })
            .HasDatabaseName("IX_AttendanceCalendar_Year_Month");

        builder.HasIndex(c => c.DayType)
            .HasDatabaseName("IX_AttendanceCalendar_DayType");

        builder.Property(c => c.HolidayName)
            .HasMaxLength(150);

        builder.Property(c => c.Description)
            .HasMaxLength(500);
    }
}
