using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class SupportActivityTypeConfiguration : IEntityTypeConfiguration<SupportActivityType>
{
    public void Configure(EntityTypeBuilder<SupportActivityType> builder)
    {
        builder.ToTable("SupportActivityTypes");
        builder.Property(s => s.Name).HasMaxLength(50).IsRequired();
        builder.HasIndex(s => s.Name).IsUnique().HasFilter("[IsActive] = 1");
    }
}
