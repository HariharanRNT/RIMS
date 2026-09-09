using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RIIMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskAndIdleReminderPersistence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Reminder30Fired",
                table: "Tasks",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Reminder15Fired",
                table: "Tasks",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ReminderCompletionFired",
                table: "Tasks",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "FiredMilestones",
                table: "IdleTimeLogs",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Reminder30Fired",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "Reminder15Fired",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "ReminderCompletionFired",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "FiredMilestones",
                table: "IdleTimeLogs");
        }
    }
}
