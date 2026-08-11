using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;

namespace RIIMS.Infrastructure.Data.Configurations;

public class WorkTaskConfiguration : IEntityTypeConfiguration<WorkTask>
{
    public void Configure(EntityTypeBuilder<WorkTask> builder)
    {
        builder.ToTable("Tasks");

        builder.Property(t => t.ModuleName).HasMaxLength(150).IsRequired();
        builder.Property(t => t.Description).HasMaxLength(500).IsRequired();
        builder.Property(t => t.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.HasIndex(t => new { t.EmployeeId, t.Status })
            .HasDatabaseName("IX_Task_EmployeeId_Status");

        builder.HasOne(t => t.Employee)
            .WithMany(e => e.Tasks)
            .HasForeignKey(t => t.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Product)
            .WithMany(p => p.Tasks)
            .HasForeignKey(t => t.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Client)
            .WithMany(c => c.Tasks)
            .HasForeignKey(t => t.ClientId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
