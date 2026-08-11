using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RIIMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDemoFollowUpAndPayslipDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Deductions",
                table: "PayslipDetails",
                newName: "TotalSalary");

            migrationBuilder.AddColumn<decimal>(
                name: "Allowances",
                table: "PayslipDetails",
                type: "decimal(12,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "Arrears",
                table: "PayslipDetails",
                type: "decimal(12,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "Conveyance",
                table: "PayslipDetails",
                type: "decimal(12,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "Esi",
                table: "PayslipDetails",
                type: "decimal(12,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "Hra",
                table: "PayslipDetails",
                type: "decimal(12,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "LopDeduction",
                table: "PayslipDetails",
                type: "decimal(12,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "Medical",
                table: "PayslipDetails",
                type: "decimal(12,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ParkingCharges",
                table: "PayslipDetails",
                type: "decimal(12,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "Pf",
                table: "PayslipDetails",
                type: "decimal(12,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "Tds",
                table: "PayslipDetails",
                type: "decimal(12,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalDeduction",
                table: "PayslipDetails",
                type: "decimal(12,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "DemoFollowUps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    SupportActivityLogId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    ClientId = table.Column<int>(type: "int", nullable: false),
                    ReviewRemarks = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    FollowUpDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ReminderSentAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DemoFollowUps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DemoFollowUps_Clients_ClientId",
                        column: x => x.ClientId,
                        principalTable: "Clients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DemoFollowUps_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DemoFollowUps_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DemoFollowUps_SupportActivityLogs_SupportActivityLogId",
                        column: x => x.SupportActivityLogId,
                        principalTable: "SupportActivityLogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DemoFollowUp_EmployeeId_Status",
                table: "DemoFollowUps",
                columns: new[] { "EmployeeId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_DemoFollowUp_FollowUpDate",
                table: "DemoFollowUps",
                column: "FollowUpDate");

            migrationBuilder.CreateIndex(
                name: "IX_DemoFollowUps_ClientId",
                table: "DemoFollowUps",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_DemoFollowUps_ProductId",
                table: "DemoFollowUps",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_DemoFollowUps_SupportActivityLogId",
                table: "DemoFollowUps",
                column: "SupportActivityLogId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DemoFollowUps");

            migrationBuilder.DropColumn(
                name: "Allowances",
                table: "PayslipDetails");

            migrationBuilder.DropColumn(
                name: "Arrears",
                table: "PayslipDetails");

            migrationBuilder.DropColumn(
                name: "Conveyance",
                table: "PayslipDetails");

            migrationBuilder.DropColumn(
                name: "Esi",
                table: "PayslipDetails");

            migrationBuilder.DropColumn(
                name: "Hra",
                table: "PayslipDetails");

            migrationBuilder.DropColumn(
                name: "LopDeduction",
                table: "PayslipDetails");

            migrationBuilder.DropColumn(
                name: "Medical",
                table: "PayslipDetails");

            migrationBuilder.DropColumn(
                name: "ParkingCharges",
                table: "PayslipDetails");

            migrationBuilder.DropColumn(
                name: "Pf",
                table: "PayslipDetails");

            migrationBuilder.DropColumn(
                name: "Tds",
                table: "PayslipDetails");

            migrationBuilder.DropColumn(
                name: "TotalDeduction",
                table: "PayslipDetails");

            migrationBuilder.RenameColumn(
                name: "TotalSalary",
                table: "PayslipDetails",
                newName: "Deductions");
        }
    }
}
