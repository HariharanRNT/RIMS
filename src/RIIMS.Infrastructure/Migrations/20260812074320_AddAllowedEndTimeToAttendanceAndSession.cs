using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RIIMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAllowedEndTimeToAttendanceAndSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF OBJECT_ID(N'[dbo].[EmployeeSessions]') IS NULL
                BEGIN
                    CREATE TABLE [dbo].[EmployeeSessions] (
                        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                        [EmployeeId] INT NOT NULL,
                        [SessionId] UNIQUEIDENTIFIER NOT NULL,
                        [TokenJti] NVARCHAR(128) NOT NULL,
                        [WorkDate] DATE NOT NULL,
                        [LoginTime] DATETIME2 NOT NULL,
                        [LastSeenAt] DATETIME2 NOT NULL,
                        [ExpiresAt] DATETIME2 NOT NULL,
                        [LogoutTime] DATETIME2 NULL,
                        [AllowedEndTime] DATETIME2 NULL,
                        [IsActive] BIT NOT NULL DEFAULT 1,
                        [DeviceInfo] NVARCHAR(512) NULL,
                        [CreatedBy] INT NULL,
                        [CreatedAt] DATETIME2 NOT NULL,
                        [UpdatedAt] DATETIME2 NOT NULL,
                        CONSTRAINT [FK_EmployeeSessions_Employees] FOREIGN KEY ([EmployeeId]) REFERENCES [dbo].[Employees]([Id]) ON DELETE CASCADE
                    );
                END
                ELSE
                BEGIN
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EmployeeSessions]') AND name = 'AllowedEndTime')
                    BEGIN
                        ALTER TABLE [dbo].[EmployeeSessions] ADD [AllowedEndTime] DATETIME2 NULL;
                    END
                END;
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[AttendanceLogs]') AND name = 'AllowedEndTime')
                BEGIN
                    ALTER TABLE [dbo].[AttendanceLogs] ADD [AllowedEndTime] DATETIME2 NULL;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowedEndTime",
                table: "EmployeeSessions");

            migrationBuilder.DropColumn(
                name: "AllowedEndTime",
                table: "AttendanceLogs");
        }
    }
}
