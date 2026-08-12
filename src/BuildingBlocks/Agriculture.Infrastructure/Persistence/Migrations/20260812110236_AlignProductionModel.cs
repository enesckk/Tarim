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
            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                schema: "agriculture",
                table: "WorkflowSteps",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlannedEvidenceJson",
                schema: "agriculture",
                table: "WorkflowSteps",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Theme",
                schema: "agriculture",
                table: "WorkflowSteps",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VideoUrl",
                schema: "agriculture",
                table: "WorkflowSteps",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EvidenceJson",
                schema: "agriculture",
                table: "Tasks",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                schema: "agriculture",
                table: "Tasks",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlannedEvidenceJson",
                schema: "agriculture",
                table: "Tasks",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RevisionReason",
                schema: "agriculture",
                table: "Tasks",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Theme",
                schema: "agriculture",
                table: "Tasks",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VideoUrl",
                schema: "agriculture",
                table: "Tasks",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AssignedOfficerUserId",
                schema: "agriculture",
                table: "Lands",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BuyerName",
                schema: "agriculture",
                table: "HarvestRecords",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalAmount",
                schema: "agriculture",
                table: "HarvestRecords",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                schema: "agriculture",
                table: "HarvestRecords",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AdminUserId",
                schema: "communication",
                table: "Conversations",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LandId",
                schema: "communication",
                table: "Conversations",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                schema: "communication",
                table: "Conversations",
                type: "int",
                nullable: false,
                defaultValue: 0);

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

            migrationBuilder.CreateTable(
                name: "LandNotes",
                schema: "agriculture",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LandId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AuthorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Body = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LandNotes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProducerNotes",
                schema: "agriculture",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProducerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AuthorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Body = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProducerNotes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_LandId_Status",
                schema: "agriculture",
                table: "Tasks",
                columns: new[] { "LandId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_ProducerId_Status",
                schema: "agriculture",
                table: "Tasks",
                columns: new[] { "ProducerId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Lands_AssignedOfficerUserId",
                schema: "agriculture",
                table: "Lands",
                column: "AssignedOfficerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_LandId",
                schema: "communication",
                table: "Conversations",
                column: "LandId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_OfficerUserId",
                schema: "communication",
                table: "Conversations",
                column: "OfficerUserId");

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

            migrationBuilder.CreateIndex(
                name: "IX_LandNotes_LandId",
                schema: "agriculture",
                table: "LandNotes",
                column: "LandId");

            migrationBuilder.CreateIndex(
                name: "IX_ProducerNotes_ProducerId",
                schema: "agriculture",
                table: "ProducerNotes",
                column: "ProducerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DevicePushTokens",
                schema: "agriculture");

            migrationBuilder.DropTable(
                name: "LandNotes",
                schema: "agriculture");

            migrationBuilder.DropTable(
                name: "ProducerNotes",
                schema: "agriculture");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_LandId_Status",
                schema: "agriculture",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_ProducerId_Status",
                schema: "agriculture",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Lands_AssignedOfficerUserId",
                schema: "agriculture",
                table: "Lands");

            migrationBuilder.DropIndex(
                name: "IX_Conversations_LandId",
                schema: "communication",
                table: "Conversations");

            migrationBuilder.DropIndex(
                name: "IX_Conversations_OfficerUserId",
                schema: "communication",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                schema: "agriculture",
                table: "WorkflowSteps");

            migrationBuilder.DropColumn(
                name: "PlannedEvidenceJson",
                schema: "agriculture",
                table: "WorkflowSteps");

            migrationBuilder.DropColumn(
                name: "Theme",
                schema: "agriculture",
                table: "WorkflowSteps");

            migrationBuilder.DropColumn(
                name: "VideoUrl",
                schema: "agriculture",
                table: "WorkflowSteps");

            migrationBuilder.DropColumn(
                name: "EvidenceJson",
                schema: "agriculture",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                schema: "agriculture",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "PlannedEvidenceJson",
                schema: "agriculture",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "RevisionReason",
                schema: "agriculture",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "Theme",
                schema: "agriculture",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "VideoUrl",
                schema: "agriculture",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "AssignedOfficerUserId",
                schema: "agriculture",
                table: "Lands");

            migrationBuilder.DropColumn(
                name: "BuyerName",
                schema: "agriculture",
                table: "HarvestRecords");

            migrationBuilder.DropColumn(
                name: "TotalAmount",
                schema: "agriculture",
                table: "HarvestRecords");

            migrationBuilder.DropColumn(
                name: "UnitPrice",
                schema: "agriculture",
                table: "HarvestRecords");

            migrationBuilder.DropColumn(
                name: "AdminUserId",
                schema: "communication",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "LandId",
                schema: "communication",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "Type",
                schema: "communication",
                table: "Conversations");
        }
    }
}
