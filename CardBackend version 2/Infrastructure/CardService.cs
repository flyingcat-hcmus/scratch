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
            var conn = db.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
            {
                await conn.OpenAsync();
            }

            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                WITH selected_card AS (
                    SELECT ""Id""
                    FROM ""Cards""
                    WHERE ""Remaining"" > 0
                    ORDER BY RANDOM()
                    LIMIT 1
                    FOR UPDATE
                )
                UPDATE ""Cards""
                SET 
                    ""Remaining"" = ""Remaining"" - 1,
                    ""DrawnAt"" = @drawnAt,
                    ""DeviceInfo"" = @deviceInfo
                FROM selected_card
                WHERE ""Cards"".""Id"" = selected_card.""Id""
                RETURNING ""Cards"".""Id"", ""Cards"".""ImgUrl"", ""Cards"".""IsRare"", ""Cards"".""Quantity"", ""Cards"".""Remaining"", ""Cards"".""DrawnAt"", ""Cards"".""DeviceInfo"";
            ";

            var pDrawnAt = cmd.CreateParameter();
            pDrawnAt.ParameterName = "@drawnAt";
            pDrawnAt.Value = DateTime.UtcNow;
            cmd.Parameters.Add(pDrawnAt);

            var pDeviceInfo = cmd.CreateParameter();
            pDeviceInfo.ParameterName = "@deviceInfo";
            pDeviceInfo.Value = (object?)deviceInfo ?? DBNull.Value;
            cmd.Parameters.Add(pDeviceInfo);

            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                var id = reader.GetGuid(0);
                var imgUrl = reader.GetString(1);
                var isRare = reader.GetBoolean(2);
                var quantity = reader.GetInt32(3);
                var remaining = reader.GetInt32(4);
                var drawnAt = reader.IsDBNull(5) ? (DateTime?)null : reader.GetDateTime(5);
                var devInfo = reader.IsDBNull(6) ? null : reader.GetString(6);

                return Card.CreateExisting(id, imgUrl, isRare, quantity, remaining, drawnAt, devInfo);
            }

            return null;
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