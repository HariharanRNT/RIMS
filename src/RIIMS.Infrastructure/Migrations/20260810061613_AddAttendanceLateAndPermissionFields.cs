using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RIIMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendanceLateAndPermissionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsLate",
                table: "AttendanceLogs",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsPermission",
                table: "AttendanceLogs",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "PermissionHours",
                table: "AttendanceLogs",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "AttendanceLogs",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsLate",
                table: "AttendanceLogs");

            migrationBuilder.DropColumn(
                name: "IsPermission",
                table: "AttendanceLogs");

            migrationBuilder.DropColumn(
                name: "PermissionHours",
                table: "AttendanceLogs");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "AttendanceLogs");
        }
    }
}
