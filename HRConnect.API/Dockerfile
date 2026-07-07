# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["HRConnect.API.csproj", "./"]
RUN dotnet restore "HRConnect.API.csproj"
COPY . .
RUN dotnet build "HRConnect.API.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "HRConnect.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "HRConnect.API.dll"]
