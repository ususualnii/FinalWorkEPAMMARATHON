using APIHandler.Entities;
using APIHandler.Exceptions;
using APIHandler.Repositories.Dishes;
using APIHandler.Repositories.Favorites;
using APIHandler.Services.Favorites;
using Moq;

namespace APIHandler.Tests.Services;

public class FavoriteServiceTests
{
    private readonly Mock<IFavoriteRepository> _favoriteRepositoryMock = new();
    private readonly Mock<IDishRepository> _dishRepositoryMock = new();

    private readonly FavoriteService _service;

    public FavoriteServiceTests()
    {
        _service = new FavoriteService(
            _favoriteRepositoryMock.Object,
            _dishRepositoryMock.Object);
    }

    [Fact]
    public async Task GetFavoriteDishesAsync_ReturnsDishesOrderedByCreationDateDescending()
    {
        var userId = "user-1";
        var olderDish = CreateDish("dish-older");
        var newerDish = CreateDish("dish-newer");

        _favoriteRepositoryMock
            .Setup(r => r.GetFavoritesByUserIdAsync(userId))
            .ReturnsAsync([
                new FavoriteDish
                {
                    UserId = userId,
                    DishId = olderDish.Id,
                    CreatedAt = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc)
                },
                new FavoriteDish
                {
                    UserId = userId,
                    DishId = newerDish.Id,
                    CreatedAt = new DateTime(2026, 2, 1, 10, 0, 0, DateTimeKind.Utc)
                }
            ]);

        _dishRepositoryMock
            .Setup(r => r.GetDishesByIdsAsync(It.IsAny<IEnumerable<string>>()))
            .ReturnsAsync([olderDish, newerDish]);

        var result = (await _service.GetFavoriteDishesAsync(userId)).ToList();

        Assert.Equal(2, result.Count);
        Assert.Equal(newerDish.Id, result[0].Id);
        Assert.Equal(olderDish.Id, result[1].Id);
    }

    [Fact]
    public async Task GetFavoriteDishesAsync_NoFavorites_ReturnsEmptyList()
    {
        _favoriteRepositoryMock
            .Setup(r => r.GetFavoritesByUserIdAsync(It.IsAny<string>()))
            .ReturnsAsync([]);

        var result = await _service.GetFavoriteDishesAsync("user-1");

        Assert.Empty(result);
        _dishRepositoryMock.Verify(
            r => r.GetDishesByIdsAsync(It.IsAny<IEnumerable<string>>()),
            Times.Never);
    }

    [Fact]
    public async Task GetFavoriteDishesAsync_DishNoLongerExists_IsSkipped()
    {
        var existingDish = CreateDish("dish-1");

        _favoriteRepositoryMock
            .Setup(r => r.GetFavoritesByUserIdAsync(It.IsAny<string>()))
            .ReturnsAsync([
                new FavoriteDish { UserId = "user-1", DishId = existingDish.Id },
                new FavoriteDish { UserId = "user-1", DishId = "dish-deleted" }
            ]);

        _dishRepositoryMock
            .Setup(r => r.GetDishesByIdsAsync(It.IsAny<IEnumerable<string>>()))
            .ReturnsAsync([existingDish]);

        var result = (await _service.GetFavoriteDishesAsync("user-1")).ToList();

        Assert.Single(result);
        Assert.Equal(existingDish.Id, result[0].Id);
    }

    [Fact]
    public async Task GetFavoriteDishesAsync_EmptyUserId_ThrowsValidationException()
    {
        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.GetFavoriteDishesAsync(" "));
    }

    [Fact]
    public async Task AddFavoriteAsync_NewFavorite_SavesIt()
    {
        var dish = CreateDish("dish-1");

        _dishRepositoryMock
            .Setup(r => r.GetDishByIdAsync(dish.Id))
            .ReturnsAsync(dish);

        _favoriteRepositoryMock
            .Setup(r => r.GetFavoriteAsync("user-1", dish.Id))
            .ReturnsAsync((FavoriteDish?)null);

        await _service.AddFavoriteAsync("user-1", dish.Id);

        _favoriteRepositoryMock.Verify(
            r => r.SaveFavoriteAsync(It.Is<FavoriteDish>(
                f => f.UserId == "user-1" && f.DishId == dish.Id)),
            Times.Once);
    }

    [Fact]
    public async Task AddFavoriteAsync_AlreadyFavorite_DoesNotSaveDuplicate()
    {
        var dish = CreateDish("dish-1");

        _dishRepositoryMock
            .Setup(r => r.GetDishByIdAsync(dish.Id))
            .ReturnsAsync(dish);

        _favoriteRepositoryMock
            .Setup(r => r.GetFavoriteAsync("user-1", dish.Id))
            .ReturnsAsync(new FavoriteDish { UserId = "user-1", DishId = dish.Id });

        await _service.AddFavoriteAsync("user-1", dish.Id);

        _favoriteRepositoryMock.Verify(
            r => r.SaveFavoriteAsync(It.IsAny<FavoriteDish>()),
            Times.Never);
    }

    [Fact]
    public async Task AddFavoriteAsync_DishNotFound_ThrowsDishNotFoundException()
    {
        _dishRepositoryMock
            .Setup(r => r.GetDishByIdAsync(It.IsAny<string>()))
            .ReturnsAsync((Dish?)null);

        await Assert.ThrowsAsync<DishNotFoundException>(() =>
            _service.AddFavoriteAsync("user-1", "unknown-dish"));

        _favoriteRepositoryMock.Verify(
            r => r.SaveFavoriteAsync(It.IsAny<FavoriteDish>()),
            Times.Never);
    }

    [Fact]
    public async Task AddFavoriteAsync_MissingDishId_ThrowsValidationException()
    {
        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.AddFavoriteAsync("user-1", ""));
    }

    [Fact]
    public async Task RemoveFavoriteAsync_ExistingFavorite_DeletesIt()
    {
        _favoriteRepositoryMock
            .Setup(r => r.GetFavoriteAsync("user-1", "dish-1"))
            .ReturnsAsync(new FavoriteDish { UserId = "user-1", DishId = "dish-1" });

        await _service.RemoveFavoriteAsync("user-1", "dish-1");

        _favoriteRepositoryMock.Verify(
            r => r.DeleteFavoriteAsync("user-1", "dish-1"),
            Times.Once);
    }

    [Fact]
    public async Task RemoveFavoriteAsync_NotFavorite_DoesNothing()
    {
        _favoriteRepositoryMock
            .Setup(r => r.GetFavoriteAsync("user-1", "dish-1"))
            .ReturnsAsync((FavoriteDish?)null);

        await _service.RemoveFavoriteAsync("user-1", "dish-1");

        _favoriteRepositoryMock.Verify(
            r => r.DeleteFavoriteAsync(It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    private static Dish CreateDish(string id) => new()
    {
        Id = id,
        Name = "Khachapuri",
        Description = "Cheese bread",
        Price = 12.5m,
        Weight = "300g",
        Calories = "650",
        Proteins = "20",
        Fats = "25",
        Carbohydrates = "70",
        Vitamins = "A, B",
        LocationId = "location-1"
    };
}
