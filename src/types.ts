export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  cost_price?: number;
  image: string;
  category_id: string;
  tags?: string[];
}

export interface CartItem extends Product {
  quantity: number;
  selectedSize: string;
  selectedExtras: string[];
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Extra {
  id: string;
  name: string;
  price: number;
}

export interface Order {
  id: string;
  created_at: string;
  total: number;
  delivery_address: {
    label: string;
    address: string;
  };
  payment_method: string;
  status: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  selected_size: string;
  selected_extras: string[];
  notes: string;
  price_at_order: number;
}
