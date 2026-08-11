using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class ProductClientMappingConfiguration : IEntityTypeConfiguration<ProductClientMapping>
{
    public void Configure(EntityTypeBuilder<ProductClientMapping> builder)
    {
        builder.ToTable("ProductClientMappings");

        builder.HasIndex(m => new { m.ProductId, m.ClientId })
            .IsUnique()
            .HasDatabaseName("UQ_Product_Client")
            .HasFilter("[IsActive] = 1");

        builder.HasOne(m => m.Product)
            .WithMany(p => p.ProductClientMappings)
            .HasForeignKey(m => m.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(m => m.Client)
            .WithMany(c => c.ProductClientMappings)
            .HasForeignKey(m => m.ClientId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
