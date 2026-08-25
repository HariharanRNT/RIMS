using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using RIIMS.Infrastructure.Data;

#nullable disable

namespace RIIMS.Infrastructure.Migrations
{
    [DbContext(typeof(RiimsDbContext))]
    [Migration("20260817100000_AddHalfDayLeaveFieldsToLeaveRequest")]
    public partial class AddHalfDayLeaveFieldsToLeaveRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LeaveDuration",
                table: "LeaveRequests",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "HalfDayType",
                table: "LeaveRequests",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LeaveDuration",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "HalfDayType",
                table: "LeaveRequests");
        }
    }
}
