export type User = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_creator: boolean;
  whop_customer_id: string | null;
  overlay_token: string;
  created_at: string;
  updated_at: string;
};

export type OAuthAccount = {
  id: string;
  user_id: string;
  provider: "google" | "twitch";
  provider_account_id: string;
  provider_username: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
};

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
  is_active: boolean;
  created_at: string;
};

export type FoodItem = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  base_price_cents: number;
  fan_price_cents: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type FoodItemWithRestaurant = FoodItem & {
  restaurant: Restaurant;
};

export type CreatorMenuItem = {
  id: string;
  creator_id: string;
  food_item_id: string;
  is_pinned: boolean;
  sort_order: number;
  added_at: string;
};

export type CreatorMenuItemWithDetails = CreatorMenuItem & {
  food_item: FoodItemWithRestaurant;
};

export type OrderStatus = "pending_payment" | "payment_complete" | "failed";

export type Order = {
  id: string;
  fan_id: string | null;
  creator_id: string;
  food_item_id: string;
  restaurant_id: string;
  fan_paid_cents: number;
  platform_fee_cents: number;
  creator_credit_cents: number;
  status: OrderStatus;
  whop_payment_id: string | null;
  message: string | null;
  fan_display_name: string | null;
  created_at: string;
  paid_at: string | null;
};

export type CreatorBalance = {
  id: string;
  creator_id: string;
  restaurant_id: string;
  balance_cents: number;
  lifetime_earned_cents: number;
  updated_at: string;
};

export type CreatorBalanceWithRestaurant = CreatorBalance & {
  restaurant: Restaurant;
};

export type CashoutStatus = "pending" | "processing" | "fulfilled" | "failed";

export type CashoutRequest = {
  id: string;
  creator_id: string;
  restaurant_id: string;
  amount_cents: number;
  gift_card_denomination: number;
  status: CashoutStatus;
  gift_card_code: string | null;
  delivery_email: string;
  fulfilled_at: string | null;
  notes: string | null;
  created_at: string;
};

export type CashoutRequestWithRestaurant = CashoutRequest & {
  restaurant: Restaurant;
};

export type NotificationType = "food_gift";

export type NotificationPayload = {
  food_name: string;
  fan_name: string;
  message: string | null;
  amount_cents: number;
  restaurant_name: string;
  restaurant_slug: string;
};

export type Notification = {
  id: string;
  creator_id: string;
  order_id: string | null;
  type: NotificationType;
  payload: NotificationPayload;
  is_read: boolean;
  created_at: string;
};
