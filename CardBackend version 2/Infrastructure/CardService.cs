using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Infrastructure;

public class CardService(CardDbContext db, ILogger<CardService> logger) : ICardService
{
    public async Task AddCardAsync(string url, bool rare, int quantity)
    {
        try
        {
            var card = Card.AddCard(url, rare, quantity);
            await db.Cards.AddAsync(card);
            await db.SaveChangesAsync();
        }
        catch (Exception e)
        {
            logger.LogError(e, "Database is currently unavailable");
        }
    }

    public async Task DeleteCardAsync(Guid Id)
    {
        try
        {
            var card = await db.Cards.FirstOrDefaultAsync(p => p.Id == Id);
            if (card is null)
            {
                return;
            }

            db.Cards.Remove(card);
            await db.SaveChangesAsync();
        }
        catch (Exception e)
        {
            logger.LogError(e, "Database is currently unavailable");
        }
    }

    public async Task<Card?> DrawCardAsync(string? deviceInfo = null)
    {
        try
        {
            var card = await db.Cards
                        .Where(p => p.Remaining > 0)
                        .OrderBy(p => EF.Functions.Random())
                        .FirstOrDefaultAsync();

            if (card is null)
            {
                return null;
            }

            card.DrawCard(deviceInfo);
            await db.SaveChangesAsync();

            return card;
        }
        catch (Exception e)
        {
            logger.LogError(e, "An error has occured");
            return null;
        }
    }

    public async Task ResetPoolAsync()
    {
        try
        {
            await db.Database.ExecuteSqlRawAsync("UPDATE \"Cards\" SET \"Remaining\" = \"Quantity\";");
        }
        catch (Exception e)
        {
            logger.LogError(e, "Database is currently unavailable");
        }
    }

    public async Task UpdateCardAsync(Guid Id, string? url, bool? rare, int? quantity)
    {
        try
        {
            var card = await db.Cards.FirstOrDefaultAsync(p => p.Id == Id);
            if (card is null)
            {
                return;
            }

            card.UpdateCard(url, rare, quantity);
            await db.SaveChangesAsync();
        }
        catch (Exception e)
        {
            logger.LogError(e, "Database is currently unavailable");
        }
    }

    public async Task<List<Card>> GetCardsAsync()
    {
        try
        {
            return await db.Cards.AsNoTracking()
                                 .ToListAsync();
        }
        catch (Exception e)
        {
            logger.LogError(e, "Database is currently unavailable");
            return [];
        }
    }
}