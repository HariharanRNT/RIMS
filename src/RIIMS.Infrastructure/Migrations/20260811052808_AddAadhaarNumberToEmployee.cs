using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RIIMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAadhaarNumberToEmployee : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AadhaarNumber",
                table: "Employees",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AadhaarNumber",
                table: "Employees");
        }
    }
}
