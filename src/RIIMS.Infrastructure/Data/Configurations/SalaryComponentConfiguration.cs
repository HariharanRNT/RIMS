using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class SalaryComponentConfiguration : IEntityTypeConfiguration<SalaryComponent>
{
    public void Configure(EntityTypeBuilder<SalaryComponent> builder)
    {
        builder.HasKey(c => c.Id);

        builder.Property(c => c.ComponentName)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(c => c.Percentage)
            .HasColumnType("decimal(5,2)");

        builder.Property(c => c.FixedAmount)
            .HasColumnType("decimal(12,2)");

        builder.Property(c => c.MonthlyAmount)
            .HasColumnType("decimal(12,2)");

        builder.HasOne(c => c.SalaryStructure)
            .WithMany(s => s.Components)
            .HasForeignKey(c => c.SalaryStructureId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
