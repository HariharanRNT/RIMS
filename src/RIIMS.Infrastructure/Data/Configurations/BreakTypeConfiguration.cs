using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class BreakTypeConfiguration : IEntityTypeConfiguration<BreakType>
{
    public void Configure(EntityTypeBuilder<BreakType> builder)
    {
        builder.ToTable("BreakTypes");
        builder.Property(b => b.Name).HasMaxLength(50).IsRequired();
        builder.HasIndex(b => b.Name).IsUnique().HasFilter("[IsActive] = 1");
    }
}
