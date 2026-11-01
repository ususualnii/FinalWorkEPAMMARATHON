import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { FavoritesService } from './favorites.service';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';

describe('FavoritesService', () => {
  const apiBaseUrl = 'https://test.api';
  let service: FavoritesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    });

    service = TestBed.inject(FavoritesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load favorite dishes', () => {
    const dish = { id: 'dish-1', name: 'Spring Salad' } as DishListResponse;

    service.getFavorites().subscribe((dishes) => {
      expect(dishes).toEqual([dish]);
    });

    const request = httpMock.expectOne(`${apiBaseUrl}/favorites`);
    expect(request.request.method).toBe('GET');
    request.flush([dish]);
  });

  it('should add a dish to favorites', () => {
    service.addFavorite('dish 1').subscribe((response) => {
      expect(response).toEqual({ message: 'Dish added to favorites' });
    });

    const request = httpMock.expectOne(`${apiBaseUrl}/favorites/dish%201`);
    expect(request.request.method).toBe('POST');
    request.flush({ message: 'Dish added to favorites' });
  });

  it('should remove a dish from favorites', () => {
    service.removeFavorite('dish-1').subscribe((response) => {
      expect(response).toEqual({ message: 'Dish removed from favorites' });
    });

    const request = httpMock.expectOne(`${apiBaseUrl}/favorites/dish-1`);
    expect(request.request.method).toBe('DELETE');
    request.flush({ message: 'Dish removed from favorites' });
  });
});
