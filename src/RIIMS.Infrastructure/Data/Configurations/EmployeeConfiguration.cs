using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> builder)
    {
        builder.ToTable("Employees");

        builder.Property(e => e.EmployeeCode).HasMaxLength(20).IsRequired();
        builder.Property(e => e.Name).HasMaxLength(150).IsRequired();
        builder.Property(e => e.Email).HasMaxLength(150).IsRequired();
        builder.Property(e => e.Phone).HasMaxLength(20);

        // Unique indexes (filtered for active records)
        builder.HasIndex(e => e.EmployeeCode)
            .IsUnique()
            .HasDatabaseName("IX_Employee_EmployeeCode")
            .HasFilter("[IsActive] = 1");

        builder.HasIndex(e => e.Email)
            .IsUnique()
            .HasDatabaseName("IX_Employee_Email")
            .HasFilter("[IsActive] = 1");

        builder.HasIndex(e => e.ReportingPersonId)
            .HasDatabaseName("IX_Employee_ReportingPersonId");

        // Self-referencing FK for reporting person
        builder.HasOne(e => e.ReportingPerson)
            .WithMany(e => e.Reportees)
            .HasForeignKey(e => e.ReportingPersonId)
            .OnDelete(DeleteBehavior.Restrict);

        // FK to Department
        builder.HasOne(e => e.Department)
            .WithMany(d => d.Employees)
            .HasForeignKey(e => e.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        // FK to Designation
        builder.HasOne(e => e.Designation)
            .WithMany(d => d.Employees)
            .HasForeignKey(e => e.DesignationId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
