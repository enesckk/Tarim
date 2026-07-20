using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Agriculture.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EnrichWorkflowStepEvidence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "QuantityUnit",
                schema: "agriculture",
                table: "WorkflowSteps",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RequiresDate",
                schema: "agriculture",
                table: "WorkflowSteps",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "RequiresQuantity",
                schema: "agriculture",
                table: "WorkflowSteps",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "QuantityUnit",
                schema: "agriculture",
                table: "Tasks",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RequiresDate",
                schema: "agriculture",
                table: "Tasks",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "RequiresQuantity",
                schema: "agriculture",
                table: "Tasks",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "QuantityUnit",
                schema: "agriculture",
                table: "WorkflowSteps");

            migrationBuilder.DropColumn(
                name: "RequiresDate",
                schema: "agriculture",
                table: "WorkflowSteps");

            migrationBuilder.DropColumn(
                name: "RequiresQuantity",
                schema: "agriculture",
                table: "WorkflowSteps");

            migrationBuilder.DropColumn(
                name: "QuantityUnit",
                schema: "agriculture",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "RequiresDate",
                schema: "agriculture",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "RequiresQuantity",
                schema: "agriculture",
                table: "Tasks");
        }
    }
}
