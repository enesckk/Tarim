using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Agriculture.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AgricultureDbContext))]
    [Migration("20260720084500_HarvestBuyerAndPrice")]
    public partial class HarvestBuyerAndPrice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BuyerName",
                schema: "agriculture",
                table: "HarvestRecords",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                schema: "agriculture",
                table: "HarvestRecords",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalAmount",
                schema: "agriculture",
                table: "HarvestRecords",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BuyerName",
                schema: "agriculture",
                table: "HarvestRecords");

            migrationBuilder.DropColumn(
                name: "UnitPrice",
                schema: "agriculture",
                table: "HarvestRecords");

            migrationBuilder.DropColumn(
                name: "TotalAmount",
                schema: "agriculture",
                table: "HarvestRecords");
        }
    }
}
