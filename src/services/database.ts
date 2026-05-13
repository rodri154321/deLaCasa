export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string | null;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  active: boolean;
  sale_price: number;
  estimated_cost: number;
  current_stock: number;
  minimum_stock: number;
  production_time_minutes: number;
  units_per_batch: number;
  sku: string;
  notes: string;
  image_url: string;
  created_at: string;
  updated_at: string;
  product_presentations?: ProductPresentation[];
}

export interface ProductPresentation {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  sale_price: number;
  active: boolean;
  created_at: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  cost_per_unit: number;
  supplier: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: string;
  product_id: string;
  name: string;
  notes: string;
  estimated_cost: number;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number;
}

export interface OrderItemPayload {
  product_id: string;
  product_presentation_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Database {
  public: {
    Tables: {
       products: {
         Row: Product;
         Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'> & {
           sale_price?: number;
           estimated_cost?: number;
           current_stock?: number;
           minimum_stock?: number;
           production_time_minutes?: number;
           units_per_batch?: number;
         };
         Update: Partial<Product>;
       };
      orders: {
        Row: Order;
        Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'> & {
          customer_email?: string | null;
        };
        Update: Partial<Order>;
      };

      recipes: {
        Row: Recipe;
        Insert: Omit<Recipe, 'id' | 'created_at' | 'updated_at'> & {
          estimated_cost?: number;
        };
        Update: Partial<Recipe>;
      };
      recipe_ingredients: {
        Row: RecipeIngredient;
        Insert: Omit<RecipeIngredient, 'id'>;
        Update: Partial<RecipeIngredient>;
      };
      ingredients: {
        Row: Ingredient;
        Insert: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'> & {
          minimum_stock?: number;
          supplier?: string;
          notes?: string;
        };
        Update: Partial<Ingredient>;
      };
      production_batches: {
        Row: {
          id: string;
          recipe_id: string;
          quantity_produced: number;
          produced_at: string;
          material_cost: number;
          extra_cost: number;
          total_cost: number;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<
          { id: string; recipe_id: string; quantity_produced: number; produced_at: string; material_cost: number; extra_cost: number; total_cost: number; notes: string | null; created_at: string },
          'id' | 'created_at' | 'produced_at' | 'material_cost' | 'extra_cost' | 'total_cost'
        >;
        Update: Partial<{
          id: string;
          recipe_id: string;
          quantity_produced: number;
          produced_at: string;
          material_cost: number;
          extra_cost: number;
          total_cost: number;
          notes: string | null;
          created_at: string;
        }>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_presentation_id: string;
          quantity: number;
          unit_price: number;
          created_at: string;
        };
        Insert: Omit<
          { id: string; order_id: string; product_id: string; product_presentation_id: string; quantity: number; unit_price: number; created_at: string },
          'id' | 'created_at'
        >;
        Update: Partial<{
          id: string;
          order_id: string;
          product_id: string;
          product_presentation_id: string;
          quantity: number;
          unit_price: number;
          created_at: string;
        }>;
      };
      product_presentations: {
        Row: ProductPresentation;
        Insert: Omit<ProductPresentation, 'id' | 'created_at'> & {
          active?: boolean;
        };
        Update: Partial<Omit<ProductPresentation, 'id' | 'product_id' | 'created_at'>>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
