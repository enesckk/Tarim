using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Agriculture.Infrastructure.Persistence;

#nullable disable

namespace Agriculture.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AgricultureDbContext))]
    [Migration("20260727140000_PlannedEvidence")]
    public partial class PlannedEvidence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PlannedEvidenceJson",
                schema: "agriculture",
                table: "Tasks",
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
                name: "PlannedEvidenceJson",
                schema: "agriculture",
                table: "WorkflowSteps",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PlannedEvidenceJson",
                schema: "agriculture",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "PlannedEvidenceJson",
                schema: "agriculture",
                table: "WorkflowSteps");

            migrationBuilder.DropColumn(
                name: "Theme",
                schema: "agriculture",
                table: "WorkflowSteps");
        }
    }
}
