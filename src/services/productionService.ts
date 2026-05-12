import { supabase } from './supabaseClient';
import type { Recipe } from './database';

export type ProductionCostInput = {
  type: string;
  amount: number;
  description?: string | null;
};

export type ProductionBatchResult = {
  batch_id: string;
  material_cost: number;
  extra_cost: number;
  total_cost: number;
};

export async function fetchRecipes() {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, product_id, name, instructions');

  if (error) {
    throw error;
  }

  return data as Recipe[];
}

export async function createProductionBatch(
  recipeId: string,
  quantityProduced: number,
  notes?: string,
  extraCosts: ProductionCostInput[] = []
) {
  const { data, error } = await supabase.rpc('create_production_batch', {
    p_recipe_id: recipeId,
    p_quantity_produced: quantityProduced,
    p_notes: notes,
    p_extra_costs: extraCosts,
  });

  if (error) {
    throw error;
  }

  return (data as ProductionBatchResult[])[0];
}
