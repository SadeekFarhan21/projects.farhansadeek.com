-- FoodMe Database Schema

-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  username text UNIQUE,
  display_name text NOT NULL,
  avatar_url text,
  bio text,
  is_creator boolean DEFAULT false,
  whop_customer_id text,
  overlay_token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- OAuth accounts (linked social providers)
CREATE TABLE oauth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  provider_username text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  UNIQUE(provider, provider_account_id)
);

-- Restaurants
CREATE TABLE restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  brand_color text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Food items catalog (platform-level)
CREATE TABLE food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) NOT NULL,
  name text NOT NULL,
  description text,
  image_url text,
  base_price_cents integer NOT NULL,
  fan_price_cents integer NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Creator menu items (what each creator shows on their page)
CREATE TABLE creator_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  food_item_id uuid REFERENCES food_items(id) NOT NULL,
  is_pinned boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  UNIQUE(creator_id, food_item_id)
);

-- Orders (fan purchases)
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id uuid REFERENCES users(id),
  creator_id uuid REFERENCES users(id) NOT NULL,
  food_item_id uuid REFERENCES food_items(id) NOT NULL,
  restaurant_id uuid REFERENCES restaurants(id) NOT NULL,
  fan_paid_cents integer NOT NULL,
  platform_fee_cents integer NOT NULL,
  creator_credit_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'payment_complete', 'failed')),
  whop_payment_id text UNIQUE,
  message text,
  fan_display_name text,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

-- Creator balances per restaurant
CREATE TABLE creator_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  restaurant_id uuid REFERENCES restaurants(id) NOT NULL,
  balance_cents integer NOT NULL DEFAULT 0,
  lifetime_earned_cents integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(creator_id, restaurant_id)
);

-- Cashout requests
CREATE TABLE cashout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES users(id) NOT NULL,
  restaurant_id uuid REFERENCES restaurants(id) NOT NULL,
  amount_cents integer NOT NULL,
  gift_card_denomination integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'fulfilled', 'failed')),
  gift_card_code text,
  delivery_email text NOT NULL,
  fulfilled_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Notifications for real-time gift alerts
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES orders(id),
  type text NOT NULL DEFAULT 'food_gift',
  payload jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Creator food photos (post-MVP)
CREATE TABLE creator_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  caption text,
  restaurant_id uuid REFERENCES restaurants(id),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_orders_creator_id ON orders(creator_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_creator_balances_creator ON creator_balances(creator_id);
CREATE INDEX idx_notifications_creator_unread ON notifications(creator_id, is_read, created_at DESC);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_food_items_restaurant ON food_items(restaurant_id);
CREATE INDEX idx_creator_menu_items_creator ON creator_menu_items(creator_id);
CREATE INDEX idx_cashout_requests_creator ON cashout_requests(creator_id);
CREATE INDEX idx_cashout_requests_status ON cashout_requests(status);

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER creator_balances_updated_at
  BEFORE UPDATE ON creator_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
