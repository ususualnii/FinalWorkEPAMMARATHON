using APIHandler.Entities;
using APIHandler.Exceptions;
using APIHandler.Repositories.Dishes;
using APIHandler.Repositories.Favorites;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace APIHandler.Services.Favorites;

public class FavoriteService : IFavoriteService
{
    private readonly IFavoriteRepository _favoriteRepository;
    private readonly IDishRepository _dishRepository;

    public FavoriteService(
        IFavoriteRepository favoriteRepository,
        IDishRepository dishRepository)
    {
        _favoriteRepository = favoriteRepository ?? throw new ArgumentNullException(nameof(favoriteRepository));
        _dishRepository = dishRepository ?? throw new ArgumentNullException(nameof(dishRepository));
    }

    public async Task<IEnumerable<Dish>> GetFavoriteDishesAsync(string userId)
    {
        EnsureNotNull(userId, nameof(userId));

        var favorites = (await _favoriteRepository.GetFavoritesByUserIdAsync(userId)).ToList();

        if (favorites.Count == 0)
        {
            return [];
        }

        var dishIds = favorites.Select(f => f.DishId).Distinct().ToList();
        var dishes = await _dishRepository.GetDishesByIdsAsync(dishIds);

        var dishesById = dishes?
            .Where(dish => dish is not null)
            .GroupBy(dish => dish.Id)
            .ToDictionary(group => group.Key, group => group.First())
            ?? [];

        return favorites
            .OrderByDescending(f => f.CreatedAt)
            .Select(favorite => dishesById.TryGetValue(favorite.DishId, out var dish) ? dish : null)
            .Where(dish => dish is not null)
            .Select(dish => dish!)
            .ToList();
    }

    public async Task AddFavoriteAsync(string userId, string dishId)
    {
        EnsureNotNull(userId, nameof(userId));
        EnsureNotNull(dishId, nameof(dishId));

        var dish = await _dishRepository.GetDishByIdAsync(dishId)
            ?? throw new DishNotFoundException($"Dish with id '{dishId}' was not found.");

        var existingFavorite = await _favoriteRepository.GetFavoriteAsync(userId, dishId);
        if (existingFavorite is not null)
        {
            return;
        }

        await _favoriteRepository.SaveFavoriteAsync(new FavoriteDish
        {
            UserId = userId,
            DishId = dish.Id,
            CreatedAt = DateTime.UtcNow
        });
    }

    public async Task RemoveFavoriteAsync(string userId, string dishId)
    {
        EnsureNotNull(userId, nameof(userId));
        EnsureNotNull(dishId, nameof(dishId));

        var existingFavorite = await _favoriteRepository.GetFavoriteAsync(userId, dishId);
        if (existingFavorite is null)
        {
            return;
        }

        await _favoriteRepository.DeleteFavoriteAsync(userId, dishId);
    }

    private static void EnsureNotNull(string? value, string paramName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ValidationException($"{paramName} is required.");
        }
    }
}
