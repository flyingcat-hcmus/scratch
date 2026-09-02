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
            logger.LogError(e, "Lỗi khi thêm thẻ vào Database: {Message}", e.Message);
            throw;
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
            logger.LogError(e, "Lỗi khi xóa thẻ khỏi Database: {Message}", e.Message);
            throw;
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
            logger.LogError(e, "Lỗi khi rút thẻ: {Message}", e.Message);
            throw;
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
            logger.LogError(e, "Lỗi khi reset pool: {Message}", e.Message);
            throw;
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
            logger.LogError(e, "Lỗi khi cập nhật thẻ: {Message}", e.Message);
            throw;
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
            logger.LogError(e, "Lỗi khi lấy danh sách thẻ từ Database: {Message}", e.Message);
            throw;
        }
    }
}