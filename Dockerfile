# ==============================================================================
# 1. Build Stage (.NET 9.0 Official Stable SDK)
# ==============================================================================
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project files
COPY ["CardBackend version 2/API/API.csproj", "CardBackend version 2/API/"]
COPY ["CardBackend version 2/Domain/Domain.csproj", "CardBackend version 2/Domain/"]
COPY ["CardBackend version 2/Infrastructure/Infrastructure.csproj", "CardBackend version 2/Infrastructure/"]

# Restore NuGet dependencies
RUN dotnet restore "CardBackend version 2/API/API.csproj"

# Copy full source code
COPY ["CardBackend version 2/", "CardBackend version 2/"]

# Publish in Release mode
WORKDIR "/src/CardBackend version 2/API"
RUN dotnet publish "API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ==============================================================================
# 2. Runtime Stage (.NET 9.0 Official Stable ASP.NET Runtime)
# ==============================================================================
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

COPY --from=build /app/publish .

# Render Web Service Configuration
ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_USE_POLLING_FILE_WATCHER=true
EXPOSE 8080

ENTRYPOINT ["dotnet", "API.dll"]
