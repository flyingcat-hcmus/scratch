using Domain;
using Domain.DTOs;
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

    public async Task<DrawnCard?> DrawCardAsync(string? deviceInfo = null)
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
                    SELECT ""Id"", ""ImgUrl"", ""IsRare""
                    FROM ""Cards""
                    WHERE ""Remaining"" > 0
                    ORDER BY RANDOM()
                    LIMIT 1
                    FOR UPDATE
                ),
                updated_card AS (
                    UPDATE ""Cards""
                    SET ""Remaining"" = ""Remaining"" - 1
                    FROM selected_card
                    WHERE ""Cards"".""Id"" = selected_card.""Id""
                    RETURNING ""Cards"".""Id"", ""Cards"".""ImgUrl"", ""Cards"".""IsRare""
                ),
                inserted_history AS (
                    INSERT INTO ""DrawHistories"" (""Id"", ""CardId"", ""DeviceInfo"", ""DrawnAt"")
                    SELECT gen_random_uuid(), ""Id"", @deviceInfo, @drawnAt
                    FROM updated_card
                    RETURNING ""DeviceInfo"", ""DrawnAt""
                )
                SELECT u.""Id"", u.""ImgUrl"", u.""IsRare"", h.""DeviceInfo"", h.""DrawnAt""
                FROM updated_card u, inserted_history h;
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
                var devInfo = reader.IsDBNull(3) ? null : reader.GetString(3);
                var drawnAt = reader.IsDBNull(4) ? (DateTime?)null : reader.GetDateTime(4);

                return new DrawnCard(id, imgUrl, isRare, devInfo, drawnAt);
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
                                 .Include(p => p.DrawHistories)
                                 .ToListAsync();
        }
        catch (Exception e)
        {
            logger.LogError(e, "Lỗi khi lấy danh sách thẻ từ Database: {Message}", e.Message);
            throw;
        }
    }
}