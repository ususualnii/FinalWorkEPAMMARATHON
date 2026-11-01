using Amazon.DynamoDBv2.DataModel;
using APIHandler.Constants;
using APIHandler.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace APIHandler.Repositories.Favorites;

public class FavoriteRepository : IFavoriteRepository
{
    private static readonly string FavoritesTableName = ResourceNames.FavoritesTableName;

    private readonly IDynamoDBContext _dynamoDbContext;

    public FavoriteRepository(IDynamoDBContext dynamoDbContext)
    {
        _dynamoDbContext = dynamoDbContext ?? throw new ArgumentNullException(nameof(dynamoDbContext));
    }

    public async Task<IEnumerable<FavoriteDish>> GetFavoritesByUserIdAsync(string userId)
    {
        var query = _dynamoDbContext.QueryAsync<FavoriteDish>(
            userId, DynamoConfig.QueryConfig(FavoritesTableName));

        return await query.GetRemainingAsync();
    }

    public async Task<FavoriteDish?> GetFavoriteAsync(string userId, string dishId)
    {
        return await _dynamoDbContext.LoadAsync<FavoriteDish>(
            userId, dishId, DynamoConfig.LoadConfig(FavoritesTableName));
    }

    public async Task SaveFavoriteAsync(FavoriteDish favorite)
    {
        await _dynamoDbContext.SaveAsync(favorite, DynamoConfig.SaveConfig(FavoritesTableName));
    }

    public async Task DeleteFavoriteAsync(string userId, string dishId)
    {
        await _dynamoDbContext.DeleteAsync<FavoriteDish>(
            userId, dishId, DynamoConfig.DeleteConfig(FavoritesTableName));
    }
}
