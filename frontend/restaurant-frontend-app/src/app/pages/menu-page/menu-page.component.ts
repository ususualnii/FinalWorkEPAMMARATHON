import {Component, OnInit, ChangeDetectionStrategy, DestroyRef, inject} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DishCardComponent } from '@app/shared/custom-components/dish-card/dish-card.component';
import { DishesService } from '@app/services/dishes/dishes.service';
import { FavoritesService } from '@app/services/favorites/favorites.service';
import { AuthenticationService } from '@app/auth/services/authentication.service';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';
import { MainCoverImageComponent } from '@app/shared/custom-components/main-cover-image/main-cover-image.component';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { DishSort } from '@app/models/enums/dish-sort.model';
import { DishType } from '@app/models/enums/dish-type.model';
import { DishSortingLabels, DishTypeLabels } from '@app/shared/mappers/dish-enum.mapper';
import { DishModalComponent } from '@app/components/dish-modal/dish-modal.component';
import { PreOrdersService } from '@app/services/pre-orders/pre-orders.service';
import {ToastService} from '@app/services/toast/toast.service';

@Component({
  selector: 'app-menu-page',
  standalone: true,
  imports: [
    RouterModule,
    DishCardComponent,
    MainCoverImageComponent,
    DishModalComponent
  ],
  templateUrl: './menu-page.component.html',
  styleUrl: './menu-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [DishesService],
})
export class MenuPageComponent implements OnInit {
  private toast = inject(ToastService);
  dishes: DishListResponse[] = [];
  filteredDishes: DishListResponse[] = [];
  isLoading = true;

  isPreOrderEnabled = false;
  preOrderReservationId?: string;
  preOrderReservationLabel?: string;

  sortOptions = Object.values(DishSort);
  sortLabels = DishSortingLabels;

  menuCategories = Object.values(DishType);
  menuCategoryLabels = DishTypeLabels;

  selectedCategory: DishType | null = null; // initially show all
  selectedSort: DishSort = DishSort.PopularityDescending;

  favoriteIds = new Set<string>();
  showFavoritesOnly = false;
  isAuthenticated = false;

  private readonly dishesService = inject(DishesService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly authService = inject(AuthenticationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private  readonly orderService = inject(PreOrdersService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.authService.isAuthorised$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isAuthorised) => {
        this.isAuthenticated = isAuthorised;

        if (isAuthorised) {
          this.loadFavorites();
        } else {
          this.favoriteIds = new Set<string>();
          this.showFavoritesOnly = false;
          this.applyFilters();
        }
      });

    this.route.queryParams.subscribe((params) => {
      const preOrder = params['preOrder'];
      this.isPreOrderEnabled = !!preOrder;
      if (this.isPreOrderEnabled) {
        this.preOrderReservationId = params['reservationId'];
        this.preOrderReservationLabel = params['reservationLabel'];
        if (!this.preOrderReservationId) {
          console.error('Pre-order is enabled but no reservation ID provided.');
          this.toast.error('Pre-order is enabled but no reservation ID provided.', 'Error');
          this.isPreOrderEnabled = false;
        }
      }

      const category = params['category'] as DishType;
      const sort = params['sort'] as DishSort;

      this.selectedCategory =
        category && Object.values(DishType).includes(category) ? category : null;
      this.selectedSort =
        sort && Object.values(DishSort).includes(sort) ? sort : DishSort.PopularityDescending;

      this.loadDishes();
    });
  }

  loadDishes(): void {
    const category = this.selectedCategory ?? undefined;
    const sort = this.selectedSort;

    this.isLoading = true;
    this.dishesService.getDishes(category, sort).subscribe({
      next: (data) => {
        this.isLoading = false;
        this.dishes = data.map((dish) => ({
          ...dish,
          imageUrl: dish.imageUrl || 'assets/img/dish.png',
          name: dish.name || 'Unknown Dish',
          price: dish.price || 0,
          weight: dish.weight || 'N/A',
          description: dish.description || 'N/A',
          state: dish.state || 'N/A',
          dishType: dish.dishType || 'N/A',
          calories: dish.calories || '0',
          proteins: dish.proteins || '0',
          fats: dish.fats || '0',
          carbohydrates: dish.carbohydrates || '0',
          vitamins: dish.vitamins || '0',
        }));

        this.filteredDishes = this.dishes;
        this.applyFilters();
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  loadFavorites(): void {
    this.favoritesService
      .getFavorites()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dishes) => {
          this.favoriteIds = new Set(dishes.map((dish) => dish.id));
          this.applyFilters();
        },
        error: () => {
          // The global HTTP interceptor already reports the failure to the user.
        },
      });
  }

  applyFilters(): void {
    this.filteredDishes = this.showFavoritesOnly
      ? this.dishes.filter((dish) => this.favoriteIds.has(dish.id))
      : this.dishes;
  }

  toggleFavoritesFilter(): void {
    if (!this.isAuthenticated) {
      this.toast.info('Sign in to save and filter your favorite dishes.', 'Favorites');
      void this.router.navigate(['/login']);
      return;
    }

    this.showFavoritesOnly = !this.showFavoritesOnly;
    this.applyFilters();
  }

  showAllDishes(): void {
    this.showFavoritesOnly = false;
    this.applyFilters();
  }

  toggleFavorite(dish: DishListResponse): void {
    if (!this.isAuthenticated) {
      this.toast.info('Sign in to save your favorite dishes.', 'Favorites');
      void this.router.navigate(['/login']);
      return;
    }

    const wasFavorite = this.favoriteIds.has(dish.id);
    this.setFavorite(dish.id, !wasFavorite);

    const request$ = wasFavorite
      ? this.favoritesService.removeFavorite(dish.id)
      : this.favoritesService.addFavorite(dish.id);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(
          wasFavorite
            ? `${dish.name} removed from favorites.`
            : `${dish.name} added to favorites.`,
          'Favorites',
        );
      },
      error: () => {
        // Roll the optimistic update back; the interceptor shows the error toast.
        this.setFavorite(dish.id, wasFavorite);
      },
    });
  }

  private setFavorite(dishId: string, isFavorite: boolean): void {
    const next = new Set(this.favoriteIds);

    if (isFavorite) {
      next.add(dishId);
    } else {
      next.delete(dishId);
    }

    this.favoriteIds = next;
    this.applyFilters();
  }

  onCategorySelected(category: DishType): void {
    this.selectedCategory = this.selectedCategory === category ? null : category;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        category: this.selectedCategory || null,
        sort: this.selectedSort,
      },
      queryParamsHandling: 'merge',
    });
  }

  onSortChanged(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const sort = selectElement.value as DishSort;
    this.selectedSort = sort;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        category: this.selectedCategory || null,
        sort: this.selectedSort,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  selectedDish: DishListResponse | null = null;

  openModal(dish: DishListResponse) {
    this.selectedDish = dish;
  }

  closeModal() {
    this.selectedDish = null;
  }

  addDishToCart(dish: DishListResponse): void {
    this.orderService
      .addDishToPreOrderByReservationId(this.preOrderReservationId!, dish, 1)
      .subscribe({
        next: () => {
          this.toast.success('Dish added to cart successfully!', 'Success');
        },
        error: (err) => {
          this.toast.error((err as Error).message, 'Error');
        },
      });
  }
}
