using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Agriculture.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AlignProductionModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Earlier hand-authored migrations already introduced the remaining
            // production-model fields and indexes. Keep this migration limited to
            // the objects that were genuinely absent from that migration chain.
            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                schema: "agriculture",
                table: "WorkflowSteps",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VideoUrl",
                schema: "agriculture",
                table: "WorkflowSteps",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                schema: "agriculture",
                table: "Tasks",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VideoUrl",
                schema: "agriculture",
                table: "Tasks",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DevicePushTokens",
                schema: "agriculture",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Token = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Platform = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    LastSeenAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DevicePushTokens", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DevicePushTokens_Token",
                schema: "agriculture",
                table: "DevicePushTokens",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DevicePushTokens_UserId",
                schema: "agriculture",
                table: "DevicePushTokens",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DevicePushTokens",
                schema: "agriculture");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                schema: "agriculture",
                table: "WorkflowSteps");

            migrationBuilder.DropColumn(
                name: "VideoUrl",
                schema: "agriculture",
                table: "WorkflowSteps");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                schema: "agriculture",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "VideoUrl",
                schema: "agriculture",
                table: "Tasks");
        }
    }
}
