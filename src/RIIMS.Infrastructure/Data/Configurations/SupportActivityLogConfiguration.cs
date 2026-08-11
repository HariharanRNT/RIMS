using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class SupportActivityLogConfiguration : IEntityTypeConfiguration<SupportActivityLog>
{
    public void Configure(EntityTypeBuilder<SupportActivityLog> builder)
    {
        builder.ToTable("SupportActivityLogs");

        builder.Property(s => s.Remarks).HasMaxLength(500);

        builder.HasOne(s => s.Employee)
            .WithMany(e => e.SupportActivityLogs)
            .HasForeignKey(s => s.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.ActivityType)
            .WithMany(at => at.SupportActivityLogs)
            .HasForeignKey(s => s.ActivityTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.HeldTask)
            .WithMany(t => t.SupportActivityLogs)
            .HasForeignKey(s => s.HeldTaskId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(s => s.Product)
            .WithMany(p => p.SupportActivityLogs)
            .HasForeignKey(s => s.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.Client)
            .WithMany(c => c.SupportActivityLogs)
            .HasForeignKey(s => s.ClientId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
