using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Agriculture.Infrastructure.Persistence;

#nullable disable

namespace Agriculture.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AgricultureDbContext))]
    [Migration("20260727200000_TaskIndexesAndRevisionReason")]
    public partial class TaskIndexesAndRevisionReason : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent: RevisionReason may already exist via EnsureSdsR16Schema bootstrap SQL.
            migrationBuilder.Sql("""
                IF COL_LENGTH(N'agriculture.Tasks', N'RevisionReason') IS NULL
                    ALTER TABLE [agriculture].[Tasks] ADD [RevisionReason] nvarchar(1000) NULL;
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Tasks_LandId_Status' AND object_id = OBJECT_ID(N'agriculture.Tasks'))
                    CREATE INDEX [IX_Tasks_LandId_Status] ON [agriculture].[Tasks]([LandId], [Status]);
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Tasks_ProducerId_Status' AND object_id = OBJECT_ID(N'agriculture.Tasks'))
                    CREATE INDEX [IX_Tasks_ProducerId_Status] ON [agriculture].[Tasks]([ProducerId], [Status]);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Tasks_LandId_Status' AND object_id = OBJECT_ID(N'agriculture.Tasks'))
                    DROP INDEX [IX_Tasks_LandId_Status] ON [agriculture].[Tasks];
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Tasks_ProducerId_Status' AND object_id = OBJECT_ID(N'agriculture.Tasks'))
                    DROP INDEX [IX_Tasks_ProducerId_Status] ON [agriculture].[Tasks];
                IF COL_LENGTH(N'agriculture.Tasks', N'RevisionReason') IS NOT NULL
                    ALTER TABLE [agriculture].[Tasks] DROP COLUMN [RevisionReason];
                """);
        }
    }
}
