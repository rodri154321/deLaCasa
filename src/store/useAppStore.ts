import create from 'zustand';
import { fetchProducts, createProduct, updateProduct, deleteProduct, ProductPayload } from '../services/productService';
import { fetchIngredients, createIngredient, updateIngredient, deleteIngredient } from '../services/stockService';
import { fetchRecipes, createRecipe, updateRecipe, deleteRecipe } from '../services/recipeService';
import { createOrderWithItems, fetchOrders } from '../services/orderService';
import type {
  Product,
  Ingredient,
  Recipe,
  Order,
  OrderItemPayload,
} from '../services/database';

type AppState = {
  products: Product[];
  orders: Order[];
  stock: Ingredient[];
  recipes: Recipe[];
  isLoading: boolean;
  error: string | null;
  loadProducts: () => Promise<void>;
  createProduct: (product: ProductPayload) => Promise<void>;
  updateProduct: (id: string, updates: Partial<ProductPayload>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  createIngredient: (ingredient: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateIngredient: (id: string, updates: Partial<Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>;
  deleteIngredient: (id: string) => Promise<void>;
  loadRecipes: () => Promise<void>;
  createRecipe: (recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>, ingredients: any[]) => Promise<void>;
  updateRecipe: (id: string, updates: Partial<Omit<Recipe, 'id' | 'created_at' | 'updated_at'>>, ingredients: any[]) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  loadOrders: () => Promise<void>;
  loadStock: () => Promise<void>;
  addOrder: (
    customerName: string,
    customerEmail: string,
    items: OrderItemPayload[]
  ) => Promise<string>;
};

export const useAppStore = create<AppState>((set, get) => ({
  products: [],
  orders: [],
  stock: [],
  recipes: [],
  isLoading: false,
  error: null,
  loadProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const products = await fetchProducts();
      set({ products });
    } catch (error: unknown) {
      console.error('loadProducts failed:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  createProduct: async (product) => {
    set({ isLoading: true, error: null });
    try {
      const newProduct = await createProduct(product);
      set((state) => ({ products: [...state.products, newProduct] }));
    } catch (error: unknown) {
      console.error('createProduct failed:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  updateProduct: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updatedProduct = await updateProduct(id, updates);
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? updatedProduct : p)),
      }));
    } catch (error: unknown) {
      console.error('updateProduct failed:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  deleteProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteProduct(id);
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
      }));
    } catch (error: unknown) {
      console.error('deleteProduct failed:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  createIngredient: async (ingredient) => {
    set({ isLoading: true, error: null });
    try {
      const newIngredient = await createIngredient(ingredient);
      set((state) => ({ stock: [...state.stock, newIngredient] }));
    } catch (error: unknown) {
      console.error('createIngredient failed:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  updateIngredient: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updatedIngredient = await updateIngredient(id, updates);
      set((state) => ({
        stock: state.stock.map((i) => (i.id === id ? updatedIngredient : i)),
      }));
    } catch (error: unknown) {
      console.error('updateIngredient failed:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  deleteIngredient: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteIngredient(id);
      set((state) => ({
        stock: state.stock.filter((i) => i.id !== id),
      }));
    } catch (error: unknown) {
      console.error('deleteIngredient failed:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  loadRecipes: async () => {
    set({ isLoading: true, error: null });
    try {
      const recipes = await fetchRecipes();
      set({ recipes });
    } catch (error: unknown) {
      console.error('loadRecipes failed:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  createRecipe: async (recipe, ingredients) => {
    set({ isLoading: true, error: null });
    try {
      const newRecipe = await createRecipe(recipe, ingredients);
      set((state) => ({ recipes: [...state.recipes, newRecipe] }));
    } catch (error: unknown) {
      console.error('createRecipe failed:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  updateRecipe: async (id, updates, ingredients) => {
    set({ isLoading: true, error: null });
    try {
      const updatedRecipe = await updateRecipe(id, updates, ingredients);
      set((state) => ({
        recipes: state.recipes.map((r) => (r.id === id ? updatedRecipe : r)),
      }));
    } catch (error: unknown) {
      console.error('updateRecipe failed:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  deleteRecipe: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteRecipe(id);
      set((state) => ({
        recipes: state.recipes.filter((r) => r.id !== id),
      }));
    } catch (error: unknown) {
      console.error('deleteRecipe failed:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  loadOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const orders = await fetchOrders();
      set({ orders });
    } catch (error: unknown) {
      console.error('loadOrders failed:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  loadStock: async () => {
    set({ isLoading: true, error: null });
    try {
      const stock = await fetchIngredients();
      set({ stock });
    } catch (error: unknown) {
      console.error('loadStock failed:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  addOrder: async (customerName, customerEmail, items) => {
    set({ isLoading: true, error: null });
    try {
      console.log('Creating order with items:', items);
      const orderId = await createOrderWithItems(customerName, customerEmail, items);
      console.log('Order created successfully:', orderId);
      set((state) => ({ orders: [...state.orders, { id: orderId, customer_name: customerName, customer_email: customerEmail, total_amount: 0, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }] }));
      return orderId;
    } catch (error: unknown) {
      console.error('addOrder failed:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
