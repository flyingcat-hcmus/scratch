using Domain;

namespace API.Endpoint;

public static class Endpoint
{
    public static void MapApiEndpoint (this IEndpointRouteBuilder endpoint)
    {
        var group = endpoint.MapGroup("/api/cards");

        group.MapGet("/", async (ICardService db) =>
        {
            var req = await db.GetCardsAsync();

            return req is not null ? Results.Ok(req) : Results.BadRequest(new {Message = "Can't get cards"});
        });

        group.MapPost("/", async (ICardService db, string url, bool rare, int quantity) =>
        {
            await db.AddCardAsync(url, rare, quantity);
            return Results.Ok();
        });

        group.MapPut("/{id}", async (ICardService db, Guid id, string? url, bool? rare, int? quantity) =>
        {
            await db.UpdateCardAsync(id, url, rare, quantity);
            return Results.Ok();
        });

        group.MapDelete("/{id}", async (ICardService db, Guid id) =>
        {
            await db.DeleteCardAsync(id);
            return Results.Ok();
        });

        group.MapPost("/draw", async (HttpContext context, ICardService db, string? deviceInfo) =>
        {
            var userAgent = deviceInfo;
            if (string.IsNullOrEmpty(userAgent))
            {
                userAgent = context.Request.Headers.UserAgent.ToString();
            }
            if (string.IsNullOrEmpty(userAgent))
            {
                userAgent = context.Connection.RemoteIpAddress?.ToString() ?? "Unknown Device";
            }

            var card = await db.DrawCardAsync(userAgent);
            if (card == null)
            {
                return Results.NotFound(new { Message = "No cards available" });
            }
            return Results.Ok(card);
        });

        group.MapPost("/reset", async (ICardService db) =>
        {
            await db.ResetPoolAsync();
            return Results.Ok();
        });
    }
}
