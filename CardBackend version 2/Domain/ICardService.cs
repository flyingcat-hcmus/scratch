using System;
using System.Collections.Generic;
using System.Text;

namespace Domain;

public interface ICardService
{
    Task<Card?> DrawCardAsync(string? deviceInfo = null);
    Task ResetPoolAsync();
    Task AddCardAsync(string url, bool rare, int quantity);
    Task DeleteCardAsync(Guid Id);
    Task UpdateCardAsync(Guid Id, string? url, bool? rare, int? quantity);
    Task<List<Card>> GetCardsAsync();
}
