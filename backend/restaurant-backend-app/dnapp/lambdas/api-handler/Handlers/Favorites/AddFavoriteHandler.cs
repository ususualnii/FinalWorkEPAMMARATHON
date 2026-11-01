using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using APIHandler.Exceptions;
using APIHandler.Helpers;
using APIHandler.Services.Favorites;
using System;
using System.Threading.Tasks;

namespace APIHandler.Handlers.Favorites;

public class AddFavoriteHandler : IApiRequestHandler
{
    private readonly IFavoriteService _favoriteService;

    public AddFavoriteHandler(IFavoriteService favoriteService)
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

        var dishId = request.PathParameters is not null &&
            request.PathParameters.TryGetValue("dishId", out var pathDishId)
                ? pathDishId
                : null;

        if (DataValidationHelper.IsMissing(dishId))
        {
            return ResponseBuilder.CreateErrorResponse(400, "Missing dish ID.", context.Logger);
        }

        try
        {
            await _favoriteService.AddFavoriteAsync(userId, dishId!);
            context.Logger.LogLine($"Dish {dishId} added to favorites of user {userId}");

            return ResponseBuilder.CreateSuccessResponse("Dish added to favorites");
        }
        catch (DishNotFoundException ex)
        {
            return ResponseBuilder.CreateErrorResponse(404, ex.Message, context.Logger);
        }
        catch (ValidationException ex)
        {
            return ResponseBuilder.CreateErrorResponse(400, ex.Message, context.Logger);
        }
    }
}
