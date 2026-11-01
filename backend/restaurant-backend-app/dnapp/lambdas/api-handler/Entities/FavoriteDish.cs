using Amazon.DynamoDBv2.DataModel;
using System;
using System.Text.Json.Serialization;

namespace APIHandler.Entities;

/// <summary>
/// Represents a dish saved by a customer to their personal favorites list.
/// Stored in the "Favorites" table with a composite key (userId + dishId),
/// which allows fetching all favorites of a single user with one query.
/// </summary>
[DynamoDBTable("Favorites")]
public class FavoriteDish
{
    [DynamoDBHashKey("userId")]
    [JsonPropertyName("userId")]
    public required string UserId { get; set; }

    [DynamoDBRangeKey("dishId")]
    [JsonPropertyName("dishId")]
    public required string DishId { get; set; }

    [DynamoDBProperty("createdAt")]
    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
