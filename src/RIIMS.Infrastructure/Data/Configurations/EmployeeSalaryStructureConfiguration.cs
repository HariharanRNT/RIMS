using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class EmployeeSalaryStructureConfiguration : IEntityTypeConfiguration<EmployeeSalaryStructure>
{
    public void Configure(EntityTypeBuilder<EmployeeSalaryStructure> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.AnnualCTC)
            .HasColumnType("decimal(12,2)");

        builder.Property(s => s.MonthlyCTC)
            .HasColumnType("decimal(12,2)");

        builder.HasOne(s => s.Employee)
            .WithMany(e => e.SalaryStructures)
            .HasForeignKey(s => s.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => new { s.EmployeeId, s.IsActive });
    }
}
