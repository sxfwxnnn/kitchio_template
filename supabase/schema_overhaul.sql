-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_slug TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('delivery', 'collection')),
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment', 'paid', 'confirmed', 'preparing',
    'out_for_delivery', 'ready_for_collection',
    'delivered', 'collected', 'cancelled'
  )),
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT,
  postcode TEXT,
  delivery_lat NUMERIC,
  delivery_lng NUMERIC,
  delivery_distance_miles NUMERIC,
  items JSONB NOT NULL DEFAULT '[]',
  special_instructions TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  loyalty_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_mins INTEGER,
  scheduled_for TIMESTAMPTZ,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  kitchio_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer profiles
CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  restaurant_slug TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  points_balance INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(10,2) NOT NULL DEFAULT 0,
  saved_addresses JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Loyalty transactions
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  restaurant_slug TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'bonus', 'refund')),
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cart intents (abandoned cart tracking)
CREATE TABLE IF NOT EXISTS cart_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  restaurant_slug TEXT NOT NULL,
  cart_json JSONB NOT NULL DEFAULT '[]',
  mode TEXT CHECK (mode IN ('delivery', 'collection')),
  postcode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ
);

-- Restaurant settings
CREATE TABLE IF NOT EXISTS restaurant_settings (
  restaurant_slug TEXT PRIMARY KEY,
  stripe_account_id TEXT,
  stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  temporarily_closed BOOLEAN NOT NULL DEFAULT FALSE,
  closed_message TEXT,
  printer_ip TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Menu item overrides (admin can toggle without editing code)
CREATE TABLE IF NOT EXISTS menu_item_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_slug TEXT NOT NULL,
  item_id TEXT NOT NULL,
  available BOOLEAN,
  is_popular BOOLEAN,
  price_override NUMERIC(10,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_slug, item_id)
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_profiles_updated_at
  BEFORE UPDATE ON customer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_settings_updated_at
  BEFORE UPDATE ON restaurant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_item_overrides_updated_at
  BEFORE UPDATE ON menu_item_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_overrides ENABLE ROW LEVEL SECURITY;

-- Orders policies
CREATE POLICY "customers_select_own_orders"
  ON orders FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "service_role_all_orders"
  ON orders FOR ALL
  USING (auth.role() = 'service_role');

-- Customer profiles policies
CREATE POLICY "customers_select_own_profile"
  ON customer_profiles FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "customers_update_own_profile"
  ON customer_profiles FOR UPDATE
  USING (auth.uid() = customer_id);

CREATE POLICY "service_role_all_profiles"
  ON customer_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- Loyalty policies
CREATE POLICY "customers_select_own_loyalty"
  ON loyalty_transactions FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "service_role_all_loyalty"
  ON loyalty_transactions FOR ALL
  USING (auth.role() = 'service_role');

-- Restaurant settings: public read
CREATE POLICY "public_read_restaurant_settings"
  ON restaurant_settings FOR SELECT
  USING (TRUE);

CREATE POLICY "service_role_all_settings"
  ON restaurant_settings FOR ALL
  USING (auth.role() = 'service_role');

-- Menu overrides: public read
CREATE POLICY "public_read_menu_overrides"
  ON menu_item_overrides FOR SELECT
  USING (TRUE);

CREATE POLICY "service_role_all_menu_overrides"
  ON menu_item_overrides FOR ALL
  USING (auth.role() = 'service_role');

-- Enable realtime on orders and restaurant_settings
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_item_overrides;

-- Insert default restaurant settings row
INSERT INTO restaurant_settings (restaurant_slug)
VALUES ('marios-pizza')
ON CONFLICT (restaurant_slug) DO NOTHING;
