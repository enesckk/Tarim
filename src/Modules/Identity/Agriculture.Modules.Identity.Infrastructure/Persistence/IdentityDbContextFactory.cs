using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Agriculture.Modules.Identity.Infrastructure.Persistence;

public sealed class IdentityDbContextFactory : IDesignTimeDbContextFactory<IdentityDbContext>
{
    public IdentityDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<IdentityDbContext>()
            .UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=AgricultureDesign;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;

        return new IdentityDbContext(options);
    }
}
