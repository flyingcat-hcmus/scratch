using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using System;
using System.Collections.Generic;
using System.IO;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

builder.Services.AddSingleton<CardService>();

var app = builder.Build();

app.UseCors("AllowAll");

// Cho phép phục vụ file tĩnh (HTML, CSS, JS) từ thư mục gốc của project
var parentFolder = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, ".."));
app.UseDefaultFiles(new DefaultFilesOptions
{
    FileProvider = new PhysicalFileProvider(parentFolder)
});
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(parentFolder),
    RequestPath = ""
});

app.MapGet("/api/cards/draw", (CardService cardService) =>
{
    var card = cardService.DrawRandomCard();
    if (card == null)
    {
        return Results.NotFound(new { message = "Đã hết thẻ trong kho!" });
    }
    return Results.Ok(card);
});

app.MapGet("/api/cards/reset", (CardService cardService) =>
{
    cardService.ResetPool();
    return Results.Ok(new { message = "Kho thẻ đã được reset về 5 thẻ." });
});

app.Run();

public class Card
{
    public bool IsRare { get; set; }
    public string Img { get; set; }
}

public class CardService
{
    private List<Card> _pool;
    private readonly Random _random = new Random();

    public CardService()
    {
        ResetPool();
    }

    public void ResetPool()
    {
        _pool = new List<Card>
        {
            new Card { IsRare = true, Img = "https://cattime.com/wp-content/uploads/sites/14/2011/12/GettyImages-1319206416-e1697653931697.jpg?w=1024" },
            new Card { IsRare = false, Img = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBCGT7VYA9RhOgINThMhjoFacQ2J86ILcJcDKQL0ugnmTSRbvcPQdnD5w&s=10" },
            new Card { IsRare = false, Img = "https://placecats.com/200/300?3" },
            new Card { IsRare = false, Img = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRIBGDzp8I00qolfUfHL5qBXSVhSJz4emasu7jOLqlQAWv2_3pgSSsZ00w1&s=10" },
            new Card { IsRare = false, Img = "https://placecats.com/200/300?4" }
        };
    }

    public Card DrawRandomCard()
    {
        // Tự động Reset kho thẻ nếu đã rút hết (Giải pháp 3)
        if (_pool.Count == 0) 
        {
            ResetPool();
        }

        int index = _random.Next(_pool.Count);
        var card = _pool[index];
        _pool.RemoveAt(index);
        return card;
    }
}
