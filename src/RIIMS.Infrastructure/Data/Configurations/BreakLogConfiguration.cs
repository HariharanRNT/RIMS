using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class BreakLogConfiguration : IEntityTypeConfiguration<BreakLog>
{
    public void Configure(EntityTypeBuilder<BreakLog> builder)
    {
        builder.ToTable("BreakLogs");

        builder.HasOne(b => b.Employee)
            .WithMany(e => e.BreakLogs)
            .HasForeignKey(b => b.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(b => b.BreakType)
            .WithMany(bt => bt.BreakLogs)
            .HasForeignKey(b => b.BreakTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(b => b.HeldTask)
            .WithMany(t => t.BreakLogs)
            .HasForeignKey(b => b.HeldTaskId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
