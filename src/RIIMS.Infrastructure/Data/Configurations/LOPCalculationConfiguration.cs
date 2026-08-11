using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class LOPCalculationConfiguration : IEntityTypeConfiguration<LOPCalculation>
{
    public void Configure(EntityTypeBuilder<LOPCalculation> builder)
    {
        builder.ToTable("LOPCalculations");

        builder.Property(l => l.LOPDays).HasColumnType("decimal(4,2)");
        builder.Property(l => l.Reason).HasMaxLength(200).IsRequired();

        builder.HasIndex(l => new { l.EmployeeId, l.Month, l.Year, l.Reason })
            .IsUnique()
            .HasDatabaseName("UQ_LOP_Employee_Month_Reason");

        builder.HasOne(l => l.Employee)
            .WithMany(e => e.LOPCalculations)
            .HasForeignKey(l => l.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
