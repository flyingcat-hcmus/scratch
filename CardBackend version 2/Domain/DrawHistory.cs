namespace Domain;

public class DrawHistory
{
    public Guid Id { get; private set; }
    public string? DeviceInfo { get; private set; }
    public DateTime? DrawnAt { get; private set; }
    public Card Card { get; private set; } = null!;
    public Guid CardId { get; private set; }

    private DrawHistory() { }

    public DrawHistory CreateDrawHistory(string deviceinf, DateTime drawtime, Guid cardId)
    {
        return new DrawHistory
        {
            Id = Guid.NewGuid(),
            DeviceInfo = deviceinf,
            DrawnAt = drawtime,
            CardId = cardId
        };
    }
}