namespace Domain.DTOs;

public record DrawnCard(
    Guid Id, 
    string ImgUrl, 
    bool IsRare, 
    string? DeviceInfo, 
    DateTime? DrawnAt
);