using Microsoft.EntityFrameworkCore;
using Domain;

namespace Infrastructure;

public class CardDbContext(DbContextOptions<CardDbContext> options) : DbContext(options)
{
    public DbSet<Card> Cards => Set<Card>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CardDbContext).Assembly);
    }
}