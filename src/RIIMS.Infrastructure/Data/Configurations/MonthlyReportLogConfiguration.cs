using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class MonthlyReportLogConfiguration : IEntityTypeConfiguration<MonthlyReportLog>
{
    public void Configure(EntityTypeBuilder<MonthlyReportLog> builder)
    {
        builder.ToTable("MonthlyReportLogs");

        builder.Property(m => m.RecipientEmail).HasMaxLength(150).IsRequired();
        builder.Property(m => m.FilePath).HasMaxLength(300).IsRequired();
    }
}
