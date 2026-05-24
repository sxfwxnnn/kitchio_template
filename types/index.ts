// ============================================
// Menu & Restaurant Types
// ============================================

export interface Extra {
  id: string;
  name: string;
  price: number;
}

export interface Option {
  id: string;
  name: string;
  price: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  required: boolean;
  options: Option[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  available: boolean;
  isPopular: boolean;
  allergens: string[];
  calories: number;
  extras: Extra[];
  optionGroups?: OptionGroup[];
  upsellPriority?: number;
  dietary?: string[];
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  logo: string;
  coverImage: string;
  primaryColor: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  minimumOrder: number;
  deliveryFee: number;
  freeDeliveryOver: number;
  address: string;
  postcode: string;
  isOpen: boolean;
  closesAt: string;
  stripeAccountId: string | null;
  maxDeliveryRadiusMiles?: number;
  restaurantLat?: number;
  restaurantLng?: number;
  publicHolidays?: string[];
  lastOrderBeforeCloseMins?: number;
}

// ============================================
// Cart Types
// ============================================

export interface SelectedOption {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
}

export interface SelectedExtra {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  cartLineId: string;
  itemId: string;
  name: string;
  selectedOptions: SelectedOption[];
  selectedExtras: SelectedExtra[];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  note?: string;
}

export type OrderMode = "delivery" | "collection";

export type CartAction =
  | { type: "ADD_ITEM"; payload: Omit<CartItem, "cartLineId"> }
  | { type: "REMOVE_ITEM"; payload: { cartLineId: string } }
  | { type: "UPDATE_QUANTITY"; payload: { cartLineId: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; payload: CartItem[] };

// ============================================
// Order Types
// ============================================

export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "courier_arrived"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  tip?: number;
  total: number;
  delivery_mode: OrderMode;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  special_instructions: string | null;
  stripe_payment_intent: string | null;
  uber_tracking_url: string | null;
  courier_name: string | null;
  courier_phone: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  quantity: number;
  item_name: string;
  selected_options: SelectedOption[];
  selected_extras: SelectedExtra[];
  unit_price: number;
  total_price: number;
  note?: string | null;
}

// ============================================
// User Profile
// ============================================

export interface Profile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  default_address: string | null;
}
