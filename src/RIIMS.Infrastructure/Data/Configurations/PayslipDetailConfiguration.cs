using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class PayslipDetailConfiguration : IEntityTypeConfiguration<PayslipDetail>
{
    public void Configure(EntityTypeBuilder<PayslipDetail> builder)
    {
        builder.ToTable("PayslipDetails");

        // Earnings
        builder.Property(p => p.BasicPay).HasColumnType("decimal(12,2)");
        builder.Property(p => p.Hra).HasColumnType("decimal(12,2)");
        builder.Property(p => p.Conveyance).HasColumnType("decimal(12,2)");
        builder.Property(p => p.Medical).HasColumnType("decimal(12,2)");
        builder.Property(p => p.Allowances).HasColumnType("decimal(12,2)");
        builder.Property(p => p.Arrears).HasColumnType("decimal(12,2)");
        builder.Property(p => p.TotalSalary).HasColumnType("decimal(12,2)");

        // Deductions
        builder.Property(p => p.LopDeduction).HasColumnType("decimal(12,2)");
        builder.Property(p => p.Esi).HasColumnType("decimal(12,2)");
        builder.Property(p => p.Pf).HasColumnType("decimal(12,2)");
        builder.Property(p => p.ParkingCharges).HasColumnType("decimal(12,2)");
        builder.Property(p => p.Tds).HasColumnType("decimal(12,2)");
        builder.Property(p => p.TotalDeduction).HasColumnType("decimal(12,2)");

        // Net Pay & LOP Days
        builder.Property(p => p.NetPay).HasColumnType("decimal(12,2)");
        builder.Property(p => p.LOPDays).HasColumnType("decimal(4,2)");
        builder.Property(p => p.ActualLeaveDays).HasColumnType("decimal(4,2)");
        builder.Property(p => p.SandwichLeaveDays).HasColumnType("decimal(4,2)");
        builder.Property(p => p.LeaveLOPDays).HasColumnType("decimal(4,2)");
        builder.Property(p => p.LateLoginLOPDays).HasColumnType("decimal(4,2)");
        builder.Property(p => p.DailySalary).HasColumnType("decimal(12,4)");

        builder.HasIndex(p => new { p.EmployeeId, p.Month, p.Year })
            .IsUnique()
            .HasDatabaseName("UQ_Payslip_Employee_Month_Year");

        builder.HasOne(p => p.Employee)
            .WithMany(e => e.PayslipDetails)
            .HasForeignKey(p => p.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
