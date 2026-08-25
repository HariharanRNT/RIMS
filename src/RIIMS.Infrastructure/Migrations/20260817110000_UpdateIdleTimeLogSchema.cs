using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using RIIMS.Infrastructure.Data;

#nullable disable

namespace RIIMS.Infrastructure.Migrations
{
    [DbContext(typeof(RiimsDbContext))]
    [Migration("20260817110000_UpdateIdleTimeLogSchema")]
    public partial class UpdateIdleTimeLogSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "EndTime",
                table: "IdleTimeLogs",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<long>(
                name: "DurationSeconds",
                table: "IdleTimeLogs",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "IdleTimeLogs",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Remarks",
                table: "IdleTimeLogs",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DurationSeconds",
                table: "IdleTimeLogs");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "IdleTimeLogs");

            migrationBuilder.DropColumn(
                name: "Remarks",
                table: "IdleTimeLogs");

            migrationBuilder.AlterColumn<DateTime>(
                name: "EndTime",
                table: "IdleTimeLogs",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);
        }
    }
}
