using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class ClientConfiguration : IEntityTypeConfiguration<Client>
{
    public void Configure(EntityTypeBuilder<Client> builder)
    {
        builder.ToTable("Clients");

        builder.Property(c => c.CompanyName).HasMaxLength(200).IsRequired();
        builder.Property(c => c.CustomerName).HasMaxLength(150).IsRequired();
        builder.Property(c => c.AddressLine1).HasMaxLength(250);
        builder.Property(c => c.AddressLine2).HasMaxLength(250);
        builder.Property(c => c.Country).HasMaxLength(100);
        builder.Property(c => c.State).HasMaxLength(100);
        builder.Property(c => c.City).HasMaxLength(100);
        builder.Property(c => c.Pincode).HasMaxLength(10);
        builder.Property(c => c.PAN).HasMaxLength(10);
        builder.Property(c => c.GSTNo).HasMaxLength(15);
        builder.Property(c => c.HSN).HasMaxLength(20);
        builder.Property(c => c.CIN).HasMaxLength(21);

        builder.HasIndex(c => c.PAN).IsUnique().HasFilter("[PAN] IS NOT NULL AND [IsActive] = 1");
        builder.HasIndex(c => c.GSTNo).IsUnique().HasDatabaseName("IX_Client_GSTNo").HasFilter("[GSTNo] IS NOT NULL AND [IsActive] = 1");
        builder.HasIndex(c => c.CIN).IsUnique().HasFilter("[CIN] IS NOT NULL AND [IsActive] = 1");
    }
}
