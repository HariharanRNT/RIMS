using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class ActivityTimelineConfiguration : IEntityTypeConfiguration<ActivityTimeline>
{
    public void Configure(EntityTypeBuilder<ActivityTimeline> builder)
    {
        builder.ToTable("ActivityTimelines");

        builder.Property(a => a.ActivityType).HasMaxLength(30).IsRequired();
        builder.Property(a => a.RefTable).HasMaxLength(50).IsRequired();
        builder.Property(a => a.Status).HasMaxLength(20).IsRequired();
        builder.Property(a => a.Remarks).HasMaxLength(500);

        builder.HasIndex(a => new { a.EmployeeId, a.StartTime })
            .HasDatabaseName("IX_ActivityTimeline_EmployeeId_StartTime");

        builder.HasOne(a => a.Employee)
            .WithMany(e => e.ActivityTimelines)
            .HasForeignKey(a => a.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
