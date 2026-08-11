using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("Products");
        builder.Property(p => p.Name).HasMaxLength(150).IsRequired();
        builder.Property(p => p.Code).HasMaxLength(30).IsRequired();
        builder.HasIndex(p => p.Code).IsUnique().HasFilter("[IsActive] = 1");
    }
}
