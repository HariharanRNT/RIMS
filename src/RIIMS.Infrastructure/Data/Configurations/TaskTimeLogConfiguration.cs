using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Data.Configurations;

public class TaskTimeLogConfiguration : IEntityTypeConfiguration<TaskTimeLog>
{
    public void Configure(EntityTypeBuilder<TaskTimeLog> builder)
    {
        builder.ToTable("TaskTimeLogs");

        builder.HasIndex(t => t.TaskId).HasDatabaseName("IX_TaskTimeLog_TaskId");

        builder.HasOne(t => t.Task)
            .WithMany(wt => wt.TimeLogs)
            .HasForeignKey(t => t.TaskId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
