export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  image: string | null;
  isFeatured: boolean;
  onSale: boolean;
  salePrice: number | null;
}

export interface Category {
  id: string;
  name: string;
}
