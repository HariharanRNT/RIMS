using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class DemoFollowUpConfiguration : IEntityTypeConfiguration<DemoFollowUp>
{
    public void Configure(EntityTypeBuilder<DemoFollowUp> builder)
    {
        builder.ToTable("DemoFollowUps");

        builder.Property(d => d.ReviewRemarks).HasMaxLength(1000).IsRequired();
        builder.Property(d => d.Status).HasConversion<string>().HasMaxLength(20);

        builder.HasIndex(d => new { d.EmployeeId, d.Status })
            .HasDatabaseName("IX_DemoFollowUp_EmployeeId_Status");

        builder.HasIndex(d => d.FollowUpDate)
            .HasDatabaseName("IX_DemoFollowUp_FollowUpDate");

        builder.HasOne(d => d.Employee)
            .WithMany()
            .HasForeignKey(d => d.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.SupportActivityLog)
            .WithMany()
            .HasForeignKey(d => d.SupportActivityLogId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Product)
            .WithMany()
            .HasForeignKey(d => d.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Client)
            .WithMany()
            .HasForeignKey(d => d.ClientId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
