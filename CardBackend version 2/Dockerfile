# ==============================================================================
# 1. Build Stage
# ==============================================================================
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

# Copy project files first to leverage Docker layer caching
COPY ["API/API.csproj", "API/"]
COPY ["Domain/Domain.csproj", "Domain/"]
COPY ["Infrastructure/Infrastructure.csproj", "Infrastructure/"]

# Restore NuGet dependencies
RUN dotnet restore "API/API.csproj"

# Copy all remaining source code
COPY . .

# Build and Publish in Release mode
WORKDIR "/src/API"
RUN dotnet publish "API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ==============================================================================
# 2. Runtime Stage
# ==============================================================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS final
WORKDIR /app

# Copy published application from build stage
COPY --from=build /app/publish .

# Render Web Service Configuration
ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_USE_POLLING_FILE_WATCHER=true
EXPOSE 8080

# Run the API
ENTRYPOINT ["dotnet", "API.dll"]
