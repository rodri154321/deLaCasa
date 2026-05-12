import { supabase } from './supabaseClient';
import type { Ingredient } from './database';

export async function fetchIngredients() {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('name');

  if (error) {
    throw error;
  }

  return data as Ingredient[];
}

export async function createIngredient(ingredient: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>) {
  const payload = {
    name: ingredient.name.trim(),
    unit: ingredient.unit || 'g',
    current_stock: Number(ingredient.current_stock || 0),
    minimum_stock: Number(ingredient.minimum_stock || 0),
    cost_per_unit: Number(ingredient.cost_per_unit || 0),
    supplier: ingredient.supplier?.trim() || '',
    notes: ingredient.notes?.trim() || '',
  };

  const { data, error } = await supabase
    .from('ingredients')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Supabase createIngredient error:', error);
    throw error;
  }

  return data as Ingredient;
}

export async function updateIngredient(id: string, updates: Partial<Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>>) {
  const payload: Partial<Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>> = { ...updates };

  if (updates.current_stock !== undefined) payload.current_stock = Number(updates.current_stock || 0);
  if (updates.minimum_stock !== undefined) payload.minimum_stock = Number(updates.minimum_stock || 0);
  if (updates.cost_per_unit !== undefined) payload.cost_per_unit = Number(updates.cost_per_unit || 0);

  const { data, error } = await supabase
    .from('ingredients')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Supabase updateIngredient error:', error);
    throw error;
  }

  return data as Ingredient;
}

export async function deleteIngredient(id: string) {
  const { error } = await supabase
    .from('ingredients')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function fetchLowStockIngredients() {
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, name, current_stock, minimum_stock')
    .lte('current_stock', 'minimum_stock');

  if (error) {
    throw error;
  }

  return data as Ingredient[];
}
