using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Agriculture.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AgricultureDbContext))]
    [Migration("20260719160000_ProducerNotes")]
    public partial class ProducerNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                name: "IX_ProducerNotes_ProducerId",
                schema: "agriculture",
                table: "ProducerNotes",
                column: "ProducerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProducerNotes",
                schema: "agriculture");
        }
    }
}
