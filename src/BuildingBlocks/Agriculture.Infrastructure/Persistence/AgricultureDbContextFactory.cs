using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Agriculture.Infrastructure.Persistence;

public sealed class AgricultureDbContextFactory : IDesignTimeDbContextFactory<AgricultureDbContext>
{
    public AgricultureDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable(
            "ConnectionStrings__DefaultConnection");
        connectionString = string.IsNullOrWhiteSpace(connectionString)
            ? "Server=(localdb)\\MSSQLLocalDB;Database=AgricultureDesign;Trusted_Connection=True;TrustServerCertificate=True"
            : connectionString;

        var options = new DbContextOptionsBuilder<AgricultureDbContext>()
            .UseSqlServer(connectionString)
            .Options;

        return new AgricultureDbContext(options);
    }
}
