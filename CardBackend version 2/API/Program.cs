using API.Endpoint;
using Domain;
using Infrastructure;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// =========================================================================
// 1. Service config
// =========================================================================
builder.AddNpgsqlDbContext<CardDbContext>("CardDb");

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddScoped<ICardService, CardService>();
builder.Services.AddOpenApi();

// =========================================================================
// 2. Set up application
// =========================================================================
var app = builder.Build();

app.UseCors("AllowAll");
app.MapOpenApi();
app.MapScalarApiReference();

// Tự động khởi tạo Database và nạp 5 thẻ mẫu ban đầu
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetService<CardDbContext>();
    if (db != null)
    {
        try
        {
            await db.Database.EnsureCreatedAsync();

            if (!await db.Cards.AnyAsync())
            {
                db.Cards.AddRange(
                    Card.AddCard("https://cattime.com/wp-content/uploads/sites/14/2011/12/GettyImages-1319206416-e1697653931697.jpg?w=1024", true, 1),
                    Card.AddCard("https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBCGT7VYA9RhOgINThMhjoFacQ2J86ILcJcDKQL0ugnmTSRbvcPQdnD5w&s=10", false, 1),
                    Card.AddCard("https://placecats.com/200/300?3", false, 1),
                    Card.AddCard("https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRIBGDzp8I00qolfUfHL5qBXSVhSJz4emasu7jOLqlQAWv2_3pgSSsZ00w1&s=10", false, 1),
                    Card.AddCard("https://placecats.com/200/300?4", false, 1)
                );
                await db.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            app.Logger.LogWarning(ex, "Could not auto-migrate or seed database on startup.");
        }
    }
}

app.MapApiEndpoint();

app.Run();