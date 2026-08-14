using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RIIMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMonthlyAttendanceCalendarAndAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AttendanceCalendars",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CalendarDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    Month = table.Column<int>(type: "int", nullable: false),
                    DayType = table.Column<int>(type: "int", nullable: false),
                    IsWorkingDay = table.Column<bool>(type: "bit", nullable: false),
                    IsHoliday = table.Column<bool>(type: "bit", nullable: false),
                    HolidayName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    PublishedBy = table.Column<int>(type: "int", nullable: true),
                    PublishedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifiedBy = table.Column<int>(type: "int", nullable: true),
                    LastModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttendanceCalendars", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AttendanceCalendarAudits",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AttendanceCalendarId = table.Column<int>(type: "int", nullable: false),
                    CalendarDate = table.Column<DateOnly>(type: "date", nullable: false),
                    OldDayType = table.Column<int>(type: "int", nullable: false),
                    NewDayType = table.Column<int>(type: "int", nullable: false),
                    OldHolidayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewHolidayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ChangedByUserId = table.Column<int>(type: "int", nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReasonForChange = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttendanceCalendarAudits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AttendanceCalendarAudits_AttendanceCalendars_AttendanceCalendarId",
                        column: x => x.AttendanceCalendarId,
                        principalTable: "AttendanceCalendars",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceCalendarAudit_CalendarDate",
                table: "AttendanceCalendarAudits",
                column: "CalendarDate");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceCalendarAudit_ChangedAt",
                table: "AttendanceCalendarAudits",
                column: "ChangedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceCalendarAudits_AttendanceCalendarId",
                table: "AttendanceCalendarAudits",
                column: "AttendanceCalendarId");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceCalendar_CalendarDate",
                table: "AttendanceCalendars",
                column: "CalendarDate",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceCalendar_DayType",
                table: "AttendanceCalendars",
                column: "DayType");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceCalendar_Year_Month",
                table: "AttendanceCalendars",
                columns: new[] { "Year", "Month" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AttendanceCalendarAudits");

            migrationBuilder.DropTable(
                name: "AttendanceCalendars");
        }
    }
}
