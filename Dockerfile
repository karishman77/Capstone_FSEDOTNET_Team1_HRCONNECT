# Multi-stage Dockerfile for HRConnect API
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files first for better layer caching
COPY HRConnect.API/HRConnect.API.csproj HRConnect.API/
RUN dotnet restore HRConnect.API/HRConnect.API.csproj

# Copy source and publish
COPY HRConnect.API/ HRConnect.API/
RUN dotnet publish HRConnect.API/HRConnect.API.csproj -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "HRConnect.API.dll"]
