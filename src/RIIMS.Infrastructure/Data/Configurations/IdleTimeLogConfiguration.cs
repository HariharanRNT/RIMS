using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class IdleTimeLogConfiguration : IEntityTypeConfiguration<IdleTimeLog>
{
    public void Configure(EntityTypeBuilder<IdleTimeLog> builder)
    {
        builder.ToTable("IdleTimeLogs");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.EndTime)
            .IsRequired(false);

        builder.Property(i => i.Type)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(i => i.Source)
            .HasMaxLength(50);

        builder.HasOne(i => i.Employee)
            .WithMany()
            .HasForeignKey(i => i.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
