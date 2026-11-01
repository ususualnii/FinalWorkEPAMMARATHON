using APIHandler.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace APIHandler.Repositories.Favorites;

public interface IFavoriteRepository
{
    Task<IEnumerable<FavoriteDish>> GetFavoritesByUserIdAsync(string userId);
    Task<FavoriteDish?> GetFavoriteAsync(string userId, string dishId);
    Task SaveFavoriteAsync(FavoriteDish favorite);
    Task DeleteFavoriteAsync(string userId, string dishId);
}
