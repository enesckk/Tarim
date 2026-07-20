using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Agriculture.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AgricultureDbContext))]
    [Migration("20260719132000_LandHubSdsR16")]
    public partial class LandHubSdsR16 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AssignedOfficerUserId",
                schema: "agriculture",
                table: "Lands",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Lands_AssignedOfficerUserId",
                schema: "agriculture",
                table: "Lands",
                column: "AssignedOfficerUserId");

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

            migrationBuilder.CreateIndex(
                name: "IX_LandNotes_LandId",
                schema: "agriculture",
                table: "LandNotes",
                column: "LandId");

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Conversations_OfficerUserId",
                schema: "communication",
                table: "Conversations");

            migrationBuilder.DropIndex(
                name: "IX_Conversations_LandId",
                schema: "communication",
                table: "Conversations");

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

            migrationBuilder.DropTable(
                name: "LandNotes",
                schema: "agriculture");

            migrationBuilder.DropIndex(
                name: "IX_Lands_AssignedOfficerUserId",
                schema: "agriculture",
                table: "Lands");

            migrationBuilder.DropColumn(
                name: "AssignedOfficerUserId",
                schema: "agriculture",
                table: "Lands");
        }
    }
}
