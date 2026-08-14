using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RIIMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMonthlyAllowedLeaveAndLopFieldsToPayslipDetail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ActualLeaveDays",
                table: "PayslipDetails",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "DailySalary",
                table: "PayslipDetails",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "LateLoginLOPDays",
                table: "PayslipDetails",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "LeaveLOPDays",
                table: "PayslipDetails",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "MonthlyAllowedLeave",
                table: "PayslipDetails",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "SandwichLeaveDays",
                table: "PayslipDetails",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ActualLeaveDays",
                table: "PayslipDetails");

            migrationBuilder.DropColumn(
                name: "DailySalary",
                table: "PayslipDetails");

            migrationBuilder.DropColumn(
                name: "LateLoginLOPDays",
                table: "PayslipDetails");

            migrationBuilder.DropColumn(
                name: "LeaveLOPDays",
                table: "PayslipDetails");

            migrationBuilder.DropColumn(
                name: "MonthlyAllowedLeave",
                table: "PayslipDetails");

            migrationBuilder.DropColumn(
                name: "SandwichLeaveDays",
                table: "PayslipDetails");
        }
    }
}
