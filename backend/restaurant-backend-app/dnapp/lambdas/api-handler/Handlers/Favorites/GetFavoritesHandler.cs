using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using APIHandler.Helpers;
using APIHandler.Mappers;
using APIHandler.Services.Favorites;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace APIHandler.Handlers.Favorites;

public class GetFavoritesHandler : IApiRequestHandler
{
    private readonly IFavoriteService _favoriteService;

    public GetFavoritesHandler(IFavoriteService favoriteService)
    {
        _favoriteService = favoriteService ?? throw new ArgumentNullException(nameof(favoriteService));
    }

    public async Task<APIGatewayProxyResponse> HandleRequest(APIGatewayProxyRequest request, ILambdaContext context)
    {
        if (request is null)
        {
            return ResponseBuilder.CreateErrorResponse(400, "Request is null", context.Logger);
        }

        var userId = UserContextHelper.GetAuthenticatedUserId(request);
        if (userId is null)
        {
            return ResponseBuilder.CreateErrorResponse(401, "Unauthorized.", context.Logger);
        }

        var dishes = await _favoriteService.GetFavoriteDishesAsync(userId);
        var response = dishes.Select(DishMapper.ToDishListResponse).ToList();

        context.Logger.LogLine($"Found {response.Count} favorite dishes for user {userId}");

        return ResponseBuilder.CreateSuccessResponse(response);
    }
}
