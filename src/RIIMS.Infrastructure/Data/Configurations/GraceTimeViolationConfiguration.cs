using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class GraceTimeViolationConfiguration : IEntityTypeConfiguration<GraceTimeViolation>
{
    public void Configure(EntityTypeBuilder<GraceTimeViolation> builder)
    {
        builder.ToTable("GraceTimeViolations");

        builder.HasIndex(g => new { g.EmployeeId, g.Date })
            .HasDatabaseName("IX_GraceTimeViolation_EmployeeId_Date");

        builder.HasOne(g => g.Employee)
            .WithMany(e => e.GraceTimeViolations)
            .HasForeignKey(g => g.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
