import { DishListResponse } from '@app/models/dishes/dish-list-response.model';
import { LocationResponse } from '@app/models/locations/location-response.model';
import { Order } from '@app/models/orders/order.model';
import { ReservationCustomer } from '@app/models/reservations/reservation.model';
import { Table } from '@app/models/tables/table.model';
import { UserModel } from '@app/auth/models/user.model';
import { DEMO_CREDENTIALS } from './demo.constants';

/**
 * Static seed data for the GitHub Pages demo build.
 *
 * The demo never talks to AWS: `demo.interceptor.ts` answers every API call
 * from these in-memory collections, so the whole UI can be explored without
 * credentials or a backend.
 */
export const DEMO_USER: UserModel = {
  id: 'demo-customer-1',
  firstName: 'Nino',
  lastName: 'Beridze',
  email: DEMO_CREDENTIALS.email,
  role: 'Customer',
};

export const DEMO_LOCATIONS: LocationResponse[] = [
  {
    id: 'loc-1',
    address: 'Rustaveli Avenue, 48',
    description:
      'Our flagship restaurant in the heart of Tbilisi, serving seasonal Georgian dishes in a bright, plant-filled dining room.',
    totalCapacity: 120,
    averageOccupancy: '72%',
    imageUrl: 'assets/img/locations/rustaveli-avenue-48.jpg',
    rating: 4.8,
  },
  {
    id: 'loc-2',
    address: 'Baratashvili Street, 14',
    description:
      'A cosy neighbourhood spot with an open kitchen, perfect for long dinners and small celebrations.',
    totalCapacity: 64,
    averageOccupancy: '65%',
    imageUrl: 'assets/img/locations/baratashvili-street-14.jpg',
    rating: 4.6,
  },
  {
    id: 'loc-3',
    address: 'Abashidze Street, 9',
    description:
      'A quiet terrace hidden from the city noise, with a menu built around local vegetables and herbs.',
    totalCapacity: 48,
    averageOccupancy: '58%',
    imageUrl: 'assets/img/locations/abashidze-street-9.jpg',
    rating: 4.7,
  },
];

const dish = (
  id: string,
  name: string,
  dishType: string,
  price: number,
  weight: string,
  imageUrl: string,
  description: string,
  state = 'Available',
): DishListResponse => ({
  id,
  name,
  imageUrl,
  price,
  state,
  weight,
  dishType,
  description,
  calories: String(Math.round(price * 18)),
  proteins: (price / 4).toFixed(1),
  fats: (price / 6).toFixed(1),
  carbohydrates: (price / 2).toFixed(1),
  vitamins: 'A, C, B6',
});

export const DEMO_DISHES: DishListResponse[] = [
  dish(
    'dish-1',
    'Spring Salad',
    'Appetizer',
    12.5,
    '240 g',
    'assets/img/dishes/spring-salad.jpg',
    'Crisp seasonal greens, radish, cucumber and a light tarragon dressing.',
  ),
  dish(
    'dish-2',
    'Avocado & Pine Nut Bowl',
    'Main course',
    16.9,
    '320 g',
    'assets/img/dishes/avocado-pine-nut-bowl.jpg',
    'Creamy avocado, toasted pine nuts, quinoa and pomegranate seeds.',
  ),
  dish(
    'dish-3',
    'Roasted Sweet Potato & Lentil Salad',
    'Main course',
    15.5,
    '300 g',
    'assets/img/dishes/roasted-sweet-potato-and-lentil-salad.jpg',
    'Caramelised sweet potato, green lentils, spinach and a walnut vinaigrette.',
  ),
  dish(
    'dish-4',
    'Fresh Strawberry & Mint Salad',
    'Dessert',
    9.5,
    '180 g',
    'assets/img/dishes/fresh-strawberry-mint-salad.jpg',
    'Sun-ripened strawberries, fresh mint and a honey-lime drizzle.',
  ),
  dish(
    'dish-5',
    'Adjarian Khachapuri',
    'Main course',
    14,
    '400 g',
    'assets/img/dish.png',
    'Boat-shaped bread filled with melted cheese, egg yolk and butter.',
  ),
  dish(
    'dish-6',
    'Spinach & Walnut Pkhali',
    'Appetizer',
    8.5,
    '200 g',
    'assets/img/dish.png',
    'Silky spinach pâté with walnuts, garlic and pomegranate.',
  ),
  dish(
    'dish-7',
    'Honey Cake',
    'Dessert',
    7.5,
    '150 g',
    'assets/img/dish.png',
    'Layered honey sponge with sour cream and a pinch of cinnamon.',
  ),
  dish(
    'dish-8',
    'Grilled Vegetable Platter',
    'Main course',
    13.5,
    '350 g',
    'assets/img/dish.png',
    'Charred aubergine, courgette, peppers and tomatoes with basil oil.',
    'OutOfStock',
  ),
];

export const DEMO_TABLES: Table[] = [
  { id: 'table-1', tableNumber: 1, locationId: 'loc-1', capacity: 2, timeRanges: [] },
  { id: 'table-2', tableNumber: 2, locationId: 'loc-1', capacity: 4, timeRanges: [] },
  { id: 'table-3', tableNumber: 3, locationId: 'loc-1', capacity: 6, timeRanges: [] },
  { id: 'table-4', tableNumber: 4, locationId: 'loc-2', capacity: 2, timeRanges: [] },
  { id: 'table-5', tableNumber: 5, locationId: 'loc-2', capacity: 4, timeRanges: [] },
  { id: 'table-6', tableNumber: 6, locationId: 'loc-3', capacity: 6, timeRanges: [] },
];

const nextDayAt = (hour: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, 0, 0, 0);
  return date;
};

export const createSeedReservations = (): ReservationCustomer[] => {
  const startTime = nextDayAt(19);
  const endTime = new Date(startTime.getTime() + 90 * 60 * 1000);

  return [
    {
      id: 'res-1',
      tableId: 'table-2',
      tableName: 'Table 2',
      customerId: DEMO_USER.id,
      startTime,
      endTime,
      guestCount: 3,
      status: 0,
      restaurantName: 'Green & Tasty',
      locationAddress: DEMO_LOCATIONS[0].address,
      waiterId: 'demo-waiter-1',
      hasSubmittedPreOrder: false,
      createdByName: `${DEMO_USER.firstName} ${DEMO_USER.lastName}`,
      createdByRole: 'Customer',
    },
  ];
};

export const createSeedOrders = (): Order[] => [
  {
    orderId: 'order-1',
    reservationId: 'res-1',
    reservationAddress: DEMO_LOCATIONS[0].address,
    reservationTime: nextDayAt(19).toISOString(),
    status: 0,
    orderItems: [
      { dish: DEMO_DISHES[0], quantity: 2, state: 0 },
      { dish: DEMO_DISHES[3], quantity: 1, state: 0 },
    ],
  },
];

export const SEED_FAVORITES = ['dish-2', 'dish-4'];
