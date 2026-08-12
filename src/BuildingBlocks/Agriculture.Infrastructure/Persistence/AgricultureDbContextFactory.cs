using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Agriculture.Infrastructure.Persistence;

public sealed class AgricultureDbContextFactory : IDesignTimeDbContextFactory<AgricultureDbContext>
{
    public AgricultureDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AgricultureDbContext>()
            .UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=AgricultureDesign;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;

        return new AgricultureDbContext(options);
    }
}
