export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
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
