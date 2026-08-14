FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy everything
COPY . .

# Restore and build the API
WORKDIR "/src/src/Hosts/Agriculture.Api"
RUN dotnet restore
RUN dotnet publish -c Release -o /app/publish
RUN dotnet tool restore --configfile /src/NuGet.Config

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
USER $APP_UID
ENTRYPOINT ["dotnet", "Agriculture.Api.dll"]
