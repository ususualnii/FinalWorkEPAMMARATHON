using APIHandler.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace APIHandler.Services.Favorites;

public interface IFavoriteService
{
    /// <summary>
    /// Returns the dishes saved by the user, most recently added first.
    /// Dishes that no longer exist in the menu are silently skipped.
    /// </summary>
    Task<IEnumerable<Dish>> GetFavoriteDishesAsync(string userId);

    /// <summary>
    /// Saves the dish to the user's favorites. The call is idempotent: saving
    /// an already favorited dish does not create a duplicate and does not fail.
    /// </summary>
    Task AddFavoriteAsync(string userId, string dishId);

    /// <summary>
    /// Removes the dish from the user's favorites. The call is idempotent:
    /// removing a dish that is not in the favorites list does not fail.
    /// </summary>
    Task RemoveFavoriteAsync(string userId, string dishId);
}
