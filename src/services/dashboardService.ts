import { supabase } from './supabaseClient';

export type DashboardMetrics = {
  total_sales: number;
  gross_profit: number;
  total_cost: number;
  net_profit: number;
};

export type LowStockItem = {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
};

export type TopProduct = {
  product_id: string;
  product_name: string;
  presentation_name?: string;
  total_quantity: number;
  sales_amount: number;
};

export async function fetchDashboardMetrics() {
  const { data, error } = await supabase
    .from('dashboard_metrics')
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as DashboardMetrics;
}

export async function fetchLowStockAlerts() {
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, name, current_stock, minimum_stock')
    .order('name');

  if (error) {
    console.error('Supabase fetchLowStockAlerts error:', error);
    throw error;
  }

  console.log('Fetched dashboard ingredients:', data);

  return (data || [])
    .map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      current_stock: Number(ingredient.current_stock || 0),
      minimum_stock: Number(ingredient.minimum_stock || 0),
    }))
    .filter((ingredient) => ingredient.current_stock <= ingredient.minimum_stock) as LowStockItem[];
}

export async function fetchTopProducts() {
  const { data, error } = await supabase
    .from('dashboard_most_sold_products')
    .select('*');

  if (error) {
    throw error;
  }

  return data as TopProduct[];
}
