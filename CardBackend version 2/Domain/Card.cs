namespace Domain;

public class Card
{
    public Guid Id { get; private set; }
    public string ImgUrl { get; private set; } = string.Empty;
    public bool IsRare { get; private set; }
    public int Quantity { get; private set; }
    public int Remaining { get; private set; }
    public List<DrawHistory> DrawHistories { get; private set; } = null!;

    private Card() { }

    public static Card AddCard(string url, bool rare, int quantity)
    {
        return new Card
        {
            Id = Guid.NewGuid(),
            ImgUrl = url,
            IsRare = rare,
            Quantity = quantity,
            Remaining = quantity
        };
    }

    public static Card CreateExisting(Guid id, string url, bool rare, int quantity, int remaining)
    {
        return new Card
        {
            Id = id,
            ImgUrl = url,
            IsRare = rare,
            Quantity = quantity,
            Remaining = remaining,
        };
    }

    public void UpdateCard(string? url, bool? rare, int? quantity)
    {
        if (!string.IsNullOrEmpty(url))
        {
            ImgUrl = url;
        }

        if (rare is not null)
        {
            IsRare = (bool)rare;
        }

        if (quantity is not null)
        {
            Quantity = (int)quantity;
            Remaining = Quantity;
        }
    }

    public void DrawCard()
    {
        Remaining--;
    }
}
