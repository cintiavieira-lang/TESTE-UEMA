
-- Create Categories Table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Products Table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  tags TEXT[], -- Array of strings
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Extras Table
CREATE TABLE extras (
  id TEXT PRIMARY KEY, -- Using string IDs like 'leite-po'
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Orders Table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT, -- Can be linked to auth.uid() if using Supabase Auth
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  delivery_address JSONB NOT NULL,
  payment_method TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Order Items Table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL, -- Snapshot of name at time of order
  quantity INTEGER NOT NULL DEFAULT 1,
  selected_size TEXT NOT NULL,
  selected_extras TEXT[], -- Array of extra IDs
  notes TEXT,
  price_at_order DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Public Read Access for Categories, Products, and Extras
CREATE POLICY "Allow public read access for categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access for products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public read access for extras" ON extras FOR SELECT USING (true);

-- Orders: Users can insert their own orders, and read them and order_items
CREATE POLICY "Allow public insert for orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert for order_items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select for orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow public select for order_items" ON order_items FOR SELECT USING (true);

-- Seed Data
INSERT INTO categories (name, icon) VALUES 
('Tradicional', '🥤'),
('Açaí', '🍇'),
('Cupuaçu', '🥥'),
('Farinha Láctea', '🥣'),
('Chocolate', '🍫');

INSERT INTO extras (id, name, price) VALUES 
('leite-po', 'Leite em Pó', 2.50),
('granola', 'Granola Crocante', 2.00),
('amendoim', 'Amendoim Extra', 1.50),
('mel', 'Mel Silvestre', 3.00),
('chocolate', 'Calda de Chocolate', 2.00);

-- Note: Products need category IDs from the insert above. 
-- In a real migration, you'd use subqueries or a script.
