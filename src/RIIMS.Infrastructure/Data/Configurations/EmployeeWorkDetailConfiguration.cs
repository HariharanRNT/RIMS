using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class EmployeeWorkDetailConfiguration : IEntityTypeConfiguration<EmployeeWorkDetail>
{
    public void Configure(EntityTypeBuilder<EmployeeWorkDetail> builder)
    {
        builder.ToTable("EmployeeWorkDetails");

        builder.HasIndex(e => e.EmployeeId)
            .HasDatabaseName("IX_EmployeeWorkDetail_EmployeeId");

        builder.Property(e => e.WorkLocation)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(e => e.EmploymentType)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.HasOne(e => e.Employee)
            .WithOne(emp => emp.WorkDetail)
            .HasForeignKey<EmployeeWorkDetail>(e => e.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
