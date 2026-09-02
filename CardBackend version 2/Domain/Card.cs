namespace Domain;

public class Card
{
    public Guid Id { get; private set; }
    public string ImgUrl { get; private set; } = string.Empty;
    public bool IsRare { get; private set; }
    public int Quantity { get; private set; }
    public int Remaining { get; private set; }
    public DateTime? DrawnAt { get; private set; }
    public string? DeviceInfo { get; private set; }

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

    public void DrawCard(string? deviceInfo = null)
    {
        Remaining--;
        DrawnAt = DateTime.UtcNow;
        if (!string.IsNullOrEmpty(deviceInfo))
        {
            DeviceInfo = deviceInfo;
        }
    }
}
