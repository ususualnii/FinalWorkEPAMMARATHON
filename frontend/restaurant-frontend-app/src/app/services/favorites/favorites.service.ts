import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly http = inject(HttpClient);

  getFavorites(): Observable<DishListResponse[]> {
    return this.http.get<DishListResponse[]>(`${this.baseUrl}/favorites`);
  }

  addFavorite(dishId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/favorites/${encodeURIComponent(dishId)}`,
      {},
    );
  }

  removeFavorite(dishId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/favorites/${encodeURIComponent(dishId)}`,
    );
  }
}
