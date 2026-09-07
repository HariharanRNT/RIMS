using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RIIMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkDateToAttendanceLogAndUniqueOpenIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Step 1: Add WorkDate as nullable DATE first ───────────────────
            // Adding as nullable allows existing rows to exist without a value
            // before we back-fill them in Step 2.
            migrationBuilder.AddColumn<DateOnly>(
                name: "WorkDate",
                table: "AttendanceLogs",
                type: "date",
                nullable: true);

            // ── Step 2: Back-fill WorkDate from LoginTime ─────────────────────
            // For existing rows, CAST the UTC LoginTime (datetime2) to DATE as
            // the best available approximation. All new records are set to the
            // correct IST date by AttendanceService.LoginAsync.
            migrationBuilder.Sql(
                "UPDATE [AttendanceLogs] SET [WorkDate] = CAST([LoginTime] AS DATE) WHERE [WorkDate] IS NULL");

            // ── Step 3: Make WorkDate NOT NULL ───────────────────────────────
            migrationBuilder.AlterColumn<DateOnly>(
                name: "WorkDate",
                table: "AttendanceLogs",
                type: "date",
                nullable: false,
                oldClrType: typeof(DateOnly),
                oldType: "date",
                oldNullable: true);

            // ── Step 4: Create the unique filtered index (BUG-024 FIX) ────────
            // Prevents more than one OPEN (LogoutTime IS NULL) AttendanceLog
            // per employee per IST work-day, even under concurrent requests.
            // Closed records are excluded from uniqueness, so same-day re-logins
            // continue to work correctly.
            migrationBuilder.CreateIndex(
                name: "UX_AttendanceLog_OpenPerDay",
                table: "AttendanceLogs",
                columns: new[] { "EmployeeId", "WorkDate" },
                unique: true,
                filter: "[LogoutTime] IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "UX_AttendanceLog_OpenPerDay",
                table: "AttendanceLogs");

            migrationBuilder.DropColumn(
                name: "WorkDate",
                table: "AttendanceLogs");
        }
    }
}
