import { HttpParams } from '@angular/common/http';

import { UserModel } from '@app/auth/models/user.model';
import { OrderItem } from '@app/models/dishes/order-item.model';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';
import { Order } from '@app/models/orders/order.model';
import { ReservationCustomer } from '@app/models/reservations/reservation.model';
import { TimeRange } from '@app/models/tables/time-range.model';

import {
  createSeedOrders,
  createSeedReservations,
  DEMO_DISHES,
  DEMO_LOCATIONS,
  DEMO_TABLES,
  DEMO_USER,
  SEED_FAVORITES,
} from './demo-data';

export interface DemoResult {
  status: number;
  body: unknown;
}

interface DemoProfile {
  firstName: string;
  lastName: string;
  email: string;
}

interface OrderItemPayload {
  dishId: string;
  quantity: number;
}

const FAVORITES_STORAGE_KEY = 'demo.favorites';
const PROFILE_STORAGE_KEY = 'demo.profile';
const SLOT_DURATION_MINUTES = 90;

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing can block storage; the demo keeps working in memory.
  }
};

const ok = (body: unknown): DemoResult => ({ status: 200, body });
const notFound = (message: string): DemoResult => ({ status: 404, body: { error: message } });

const asRecord = (body: unknown): Record<string, unknown> =>
  body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : {};

const readString = (body: Record<string, unknown>, key: string): string => {
  const value = body[key];
  return typeof value === 'string' ? value : '';
};

const readNumber = (body: Record<string, unknown>, key: string, fallback: number): number => {
  const value = body[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

/**
 * A tiny in-memory stand-in for the real API Gateway + Lambda backend.
 * Every endpoint used by the customer-facing screens is implemented here.
 */
class DemoBackend {
  private readonly favoriteIds = new Set<string>(
    readJson<string[]>(FAVORITES_STORAGE_KEY, SEED_FAVORITES),
  );

  private readonly reservations: ReservationCustomer[] = createSeedReservations();

  private readonly orders: Order[] = createSeedOrders();

  handle(method: string, path: string, params: HttpParams, body: unknown): DemoResult {
    const segments = path
      .split('/')
      .filter((segment) => segment.length > 0)
      .map((segment) => decodeURIComponent(segment));
    const payload = asRecord(body);

    if (method === 'GET' && path === '/locations') {
      return ok(DEMO_LOCATIONS);
    }

    if (method === 'GET' && segments[0] === 'locations' && segments.length === 2) {
      const location = DEMO_LOCATIONS.find((item) => item.id === segments[1]);
      return location ? ok(location) : notFound('Location not found.');
    }

    if (method === 'GET' && segments[0] === 'locations' && segments[2] === 'dishes') {
      return ok(DEMO_DISHES);
    }

    if (method === 'GET' && path === '/dishes/popular') {
      return ok(DEMO_DISHES.slice(0, 4));
    }

    if (method === 'GET' && path === '/dishes') {
      return ok(this.filterAndSortDishes(params));
    }

    if (method === 'GET' && path === '/favorites') {
      return ok(DEMO_DISHES.filter((dish) => this.favoriteIds.has(dish.id)));
    }

    if (segments[0] === 'favorites' && segments.length === 2) {
      const dish = DEMO_DISHES.find((item) => item.id === segments[1]);

      if (!dish) {
        return notFound('Dish not found.');
      }

      if (method === 'POST') {
        this.favoriteIds.add(dish.id);
        this.persistFavorites();
        return ok({ message: 'Dish added to favorites' });
      }

      if (method === 'DELETE') {
        this.favoriteIds.delete(dish.id);
        this.persistFavorites();
        return ok({ message: 'Dish removed from favorites' });
      }
    }

    if (method === 'GET' && path === '/me') {
      return ok(this.currentUser());
    }

    if (method === 'PUT' && path === '/me') {
      const current = readJson<DemoProfile | null>(PROFILE_STORAGE_KEY, null) ?? {
        firstName: DEMO_USER.firstName,
        lastName: DEMO_USER.lastName,
        email: DEMO_USER.email,
      };
      writeJson(PROFILE_STORAGE_KEY, {
        ...current,
        firstName: readString(payload, 'firstName') || current.firstName,
        lastName: readString(payload, 'lastName') || current.lastName,
      });
      return ok({ message: 'Profile updated successfully' });
    }

    if (method === 'PUT' && path === '/me/change-password') {
      return ok({ message: 'Password changed successfully' });
    }

    if (method === 'PUT' && path === '/me/profile-image') {
      return ok('assets/img/avatar.png');
    }

    if (method === 'GET' && segments[0] === 'users' && segments[2] === 'name') {
      const user = this.currentUser();
      return ok({ name: `${user.firstName} ${user.lastName}` });
    }

    if (method === 'GET' && segments[0] === 'users' && segments[2] === 'profile-image') {
      return ok({ presignedUrl: 'assets/img/avatar.png' });
    }

    if (method === 'GET' && path === '/available-tables') {
      return ok(this.availableTables(params));
    }

    if (method === 'GET' && segments[0] === 'tables' && segments[2] === 'available-time-slots') {
      return ok(this.timeSlots(params.get('startTime')));
    }

    if (method === 'GET' && path === '/reservations') {
      return ok(this.reservations);
    }

    if (method === 'GET' && segments[0] === 'reservations' && segments[2] === 'feedback') {
      return notFound('Feedback not found.');
    }

    if (method === 'GET' && segments[0] === 'reservations' && segments.length === 2) {
      const reservation = this.findReservation(segments[1]);
      return reservation ? ok(reservation) : notFound('Reservation not found.');
    }

    if (method === 'POST' && path === '/reservations') {
      return ok(this.createReservation(payload));
    }

    if (method === 'PUT' && path === '/reservations') {
      return this.updateReservation(payload);
    }

    if (method === 'DELETE' && path === '/reservations') {
      const id = readString(payload, 'id');
      const reservation = this.findReservation(id);

      if (!reservation) {
        return notFound('Reservation not found.');
      }

      reservation.status = 1;
      return ok({ message: 'Reservation cancelled' });
    }

    if (method === 'PATCH' && segments[0] === 'reservations' && segments[2] === 'status') {
      const reservation = this.findReservation(segments[1]);

      if (!reservation) {
        return notFound('Reservation not found.');
      }

      reservation.status = readNumber(payload, 'newStatus', reservation.status);
      return ok(reservation);
    }

    if (method === 'PATCH' && segments[0] === 'reservations' && segments[2] === 'table') {
      const reservation = this.findReservation(segments[1]);
      const table = DEMO_TABLES.find((item) => item.id === readString(payload, 'tableId'));

      if (!reservation || !table) {
        return notFound('Reservation or table not found.');
      }

      reservation.tableId = table.id;
      reservation.tableName = `Table ${table.tableNumber}`;
      return ok(reservation);
    }

    if (method === 'GET' && path === '/orders') {
      return ok(this.orders);
    }

    if (method === 'GET' && segments[0] === 'orders' && segments.length === 2) {
      const order = this.orders.find((item) => item.reservationId === segments[1]);
      return order ? ok(order) : notFound('Order not found.');
    }

    if (method === 'POST' && path === '/orders') {
      return ok(this.createOrder(payload));
    }

    if (method === 'PUT' && segments[0] === 'orders' && segments.length === 2) {
      return this.updateOrder(segments[1], payload);
    }

    if (method === 'DELETE' && segments[0] === 'orders' && segments.length === 2) {
      const index = this.orders.findIndex((item) => item.reservationId === segments[1]);

      if (index >= 0) {
        this.orders.splice(index, 1);
      }

      return ok({ message: 'Pre-order cancelled' });
    }

    if (method === 'POST' && segments[0] === 'orders' && segments[2] === 'submit') {
      return this.setOrderStatus(segments[1], 1);
    }

    if (method === 'POST' && segments[0] === 'orders' && segments[2] === 'unsubmit') {
      return this.setOrderStatus(segments[1], 0);
    }

    if (method === 'POST' && path === '/feedback') {
      return ok(this.feedbackItem(payload));
    }

    if (method === 'PUT' && path === '/feedback') {
      return ok({ message: 'Feedback updated' });
    }

    if (method === 'GET' && path === '/feedback') {
      return ok({ items: [], totalPages: 0, currentPage: 1 });
    }

    if (method === 'GET' && path === '/notifications') {
      return ok([]);
    }

    if (method === 'PATCH' && segments[0] === 'notifications') {
      return ok({ message: 'Notification marked as read' });
    }

    // Anything else is a screen that is out of scope for the public demo.
    return ok(method === 'GET' ? [] : { message: 'Demo mode: action simulated.' });
  }

  private filterAndSortDishes(params: HttpParams): DishListResponse[] {
    const dishType = params.get('dishType');
    const name = params.get('name');
    const sortBy = params.get('sortBy');

    let dishes = [...DEMO_DISHES];

    if (dishType) {
      const normalized = dishType.replace(/\s+/g, '').toLowerCase();
      dishes = dishes.filter(
        (dish) => dish.dishType.replace(/\s+/g, '').toLowerCase() === normalized,
      );
    }

    if (name) {
      const normalized = name.toLowerCase();
      dishes = dishes.filter((dish) => dish.name.toLowerCase().includes(normalized));
    }

    switch (sortBy) {
      case 'PriceAscending':
        dishes.sort((left, right) => left.price - right.price);
        break;
      case 'PriceDescending':
        dishes.sort((left, right) => right.price - left.price);
        break;
      case 'PopularityAscending':
        dishes.reverse();
        break;
      default:
        break;
    }

    return dishes;
  }

  private availableTables(params: HttpParams): typeof DEMO_TABLES {
    const capacity = Number(params.get('capacity') ?? 1);
    const locationId = params.get('locationId');

    return DEMO_TABLES.filter(
      (table) =>
        table.capacity >= capacity && (locationId === null || table.locationId === locationId),
    ).map((table) => ({ ...table, timeRanges: [] }));
  }

  private timeSlots(startTime: string | null): TimeRange[] {
    const requested = startTime ? new Date(startTime) : new Date();
    const base = Number.isNaN(requested.getTime()) ? new Date() : requested;

    return [0, 30, 60, 90].map((offsetMinutes) => {
      const start = new Date(base.getTime() + offsetMinutes * 60_000);
      const end = new Date(start.getTime() + SLOT_DURATION_MINUTES * 60_000);
      return { start: start.toISOString(), end: end.toISOString() };
    });
  }

  private createReservation(payload: Record<string, unknown>): ReservationCustomer {
    const user = this.currentUser();
    const table =
      DEMO_TABLES.find((item) => item.id === readString(payload, 'tableId')) ?? DEMO_TABLES[0];
    const location =
      DEMO_LOCATIONS.find((item) => item.id === table.locationId) ?? DEMO_LOCATIONS[0];
    const startTime = new Date(readString(payload, 'startTime'));
    const endTime = new Date(readString(payload, 'endTime'));

    const reservation: ReservationCustomer = {
      id: `res-${Date.now()}`,
      tableId: table.id,
      tableName: `Table ${table.tableNumber}`,
      customerId: user.id,
      startTime: Number.isNaN(startTime.getTime()) ? new Date() : startTime,
      endTime: Number.isNaN(endTime.getTime()) ? new Date() : endTime,
      guestCount: readNumber(payload, 'guestCount', 1),
      status: 0,
      restaurantName: 'Green & Tasty',
      locationAddress: location.address,
      waiterId: 'demo-waiter-1',
      hasSubmittedPreOrder: false,
      createdByName: `${user.firstName} ${user.lastName}`,
      createdByRole: 'Customer',
    };

    this.reservations.unshift(reservation);
    return reservation;
  }

  private updateReservation(payload: Record<string, unknown>): DemoResult {
    const reservation = this.findReservation(readString(payload, 'reservationId'));

    if (!reservation) {
      return notFound('Reservation not found.');
    }

    reservation.guestCount = readNumber(payload, 'guestCount', reservation.guestCount);

    const startTime = new Date(readString(payload, 'startTime'));
    const endTime = new Date(readString(payload, 'endTime'));

    if (!Number.isNaN(startTime.getTime())) {
      reservation.startTime = startTime;
    }
    if (!Number.isNaN(endTime.getTime())) {
      reservation.endTime = endTime;
    }

    return ok(reservation);
  }

  private createOrder(payload: Record<string, unknown>): Order {
    const reservationId = readString(payload, 'reservationId');
    const reservation = this.findReservation(reservationId);
    const items = this.buildOrderItems(payload);

    const order: Order = {
      orderId: `order-${Date.now()}`,
      reservationId,
      reservationAddress: reservation?.locationAddress ?? DEMO_LOCATIONS[0].address,
      reservationTime: new Date(reservation?.startTime ?? new Date()).toISOString(),
      status: 0,
      orderItems: items,
    };

    this.orders.unshift(order);
    return order;
  }

  private updateOrder(reservationId: string, payload: Record<string, unknown>): DemoResult {
    const order = this.orders.find((item) => item.reservationId === reservationId);

    if (!order) {
      return notFound('Order not found.');
    }

    order.orderItems = this.buildOrderItems(payload);
    return ok(order);
  }

  private buildOrderItems(payload: Record<string, unknown>): OrderItem[] {
    const rawItems = payload['orderItems'];

    if (!Array.isArray(rawItems)) {
      return [];
    }

    return rawItems.reduce<OrderItem[]>((items, rawItem) => {
      const item = asRecord(rawItem);
      const dish = DEMO_DISHES.find((candidate) => candidate.id === readString(item, 'dishId'));

      if (dish) {
        items.push({
          dish,
          quantity: Math.max(1, readNumber(item, 'quantity', 1)),
          state: 0,
        });
      }

      return items;
    }, []);
  }

  private setOrderStatus(reservationId: string, status: number): DemoResult {
    const order = this.orders.find((item) => item.reservationId === reservationId);

    if (!order) {
      return notFound('Order not found.');
    }

    order.status = status;
    return ok({ message: status === 1 ? 'Pre-order submitted' : 'Pre-order unsubmitted' });
  }

  private feedbackItem(payload: Record<string, unknown>): unknown {
    const user = this.currentUser();

    return {
      userId: user.id,
      locationId: DEMO_LOCATIONS[0].id,
      reservationId: readString(payload, 'reservationId'),
      username: `${user.firstName} ${user.lastName}`,
      rating: readNumber(payload, 'rating', 5),
      comment: readString(payload, 'comment'),
      createdAt: new Date().toISOString(),
      type: readString(payload, 'type') || 'service',
    };
  }

  private findReservation(id: string): ReservationCustomer | undefined {
    return this.reservations.find((reservation) => reservation.id === id);
  }

  private currentUser(): UserModel {
    const profile = readJson<DemoProfile | null>(PROFILE_STORAGE_KEY, null);

    return profile ? { ...DEMO_USER, ...profile, role: DEMO_USER.role } : DEMO_USER;
  }

  private persistFavorites(): void {
    writeJson(FAVORITES_STORAGE_KEY, [...this.favoriteIds]);
  }
}

export const demoBackend = new DemoBackend();
