import { supabase } from './supabaseClient';
import type { Recipe, RecipeIngredient } from './database';

export async function fetchRecipes() {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      products (
        id,
        name
      )
    `)
    .order('name');

  if (error) {
    throw error;
  }

  return data as (Recipe & { products: { id: string; name: string } })[];
}

export async function fetchRecipeById(id: string) {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      products (
        id,
        name
      ),
      recipe_ingredients (
        id,
        quantity,
        ingredients (
          id,
          name,
          unit,
          cost_per_unit
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data as Recipe & {
    products: { id: string; name: string };
    recipe_ingredients: Array<{
      id: string;
      quantity: number;
      ingredients: {
        id: string;
        name: string;
        unit: string;
        cost_per_unit: number;
      };
    }>;
  };
}

export async function createRecipe(recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>, ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id'>[]) {
  try {
    const validIngredients = ingredients
      .filter((ing) => ing.ingredient_id && Number(ing.quantity || 0) > 0)
      .map((ing) => ({
        ingredient_id: ing.ingredient_id,
        quantity: Number(ing.quantity || 0),
      }));

    const estimatedCost = await calculateRecipeCost(validIngredients);

    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        product_id: recipe.product_id,
        name: recipe.name.trim(),
        notes: recipe.notes?.trim() || '',
        estimated_cost: Number(estimatedCost || 0),
      })
      .select()
      .single();

    if (recipeError) {
      console.error('Supabase createRecipe error:', recipeError);
      throw recipeError;
    }

    const recipeWithIngredients = recipeData as Recipe;

    if (validIngredients.length > 0) {
      const ingredientsToInsert = validIngredients.map(ing => ({
        recipe_id: recipeWithIngredients.id,
        ingredient_id: ing.ingredient_id,
        quantity: Number(ing.quantity || 0),
      }));

      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientsToInsert);

      if (ingredientsError) {
        console.error('Supabase createRecipe ingredients error:', ingredientsError);
        throw ingredientsError;
      }
    }

    return recipeWithIngredients;
  } catch (error) {
    console.error('createRecipe failed:', error);
    throw error;
  }
}

export async function updateRecipe(id: string, updates: Partial<Omit<Recipe, 'id' | 'created_at' | 'updated_at'>>, ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id'>[]) {
  const validIngredients = ingredients
    .filter((ing) => ing.ingredient_id && Number(ing.quantity || 0) > 0)
    .map((ing) => ({
      ingredient_id: ing.ingredient_id,
      quantity: Number(ing.quantity || 0),
    }));

  const estimatedCost = await calculateRecipeCost(validIngredients);
  const recipePayload: Partial<Omit<Recipe, 'id' | 'created_at' | 'updated_at'>> = {
    estimated_cost: Number(estimatedCost || 0),
  };

  if (updates.product_id) {
    recipePayload.product_id = updates.product_id;
  }

  if (updates.name !== undefined) {
    recipePayload.name = updates.name.trim();
  }

  if (updates.notes !== undefined) {
    recipePayload.notes = updates.notes?.trim() || '';
  }

  const { data, error } = await supabase
    .from('recipes')
    .update(recipePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Supabase updateRecipe error:', error);
    throw error;
  }

  const { error: deleteIngredientsError } = await supabase
    .from('recipe_ingredients')
    .delete()
    .eq('recipe_id', id);

  if (deleteIngredientsError) {
    console.error('Supabase updateRecipe delete ingredients error:', deleteIngredientsError);
    throw deleteIngredientsError;
  }

  if (validIngredients.length > 0) {
    const ingredientsToInsert = validIngredients.map(ing => ({
      recipe_id: id,
      ingredient_id: ing.ingredient_id,
      quantity: Number(ing.quantity || 0),
    }));

    const { error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientsToInsert);

    if (ingredientsError) {
      console.error('Supabase updateRecipe ingredients error:', ingredientsError);
      throw ingredientsError;
    }
  }

  return data as Recipe;
}

export async function deleteRecipe(id: string) {
  const { error: ingredientsError } = await supabase
    .from('recipe_ingredients')
    .delete()
    .eq('recipe_id', id);

  if (ingredientsError) {
    console.error('Supabase deleteRecipe ingredients error:', ingredientsError);
    throw ingredientsError;
  }

  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Supabase deleteRecipe error:', error);
    throw error;
  }
}

async function calculateRecipeCost(ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id'>[]): Promise<number> {
  if (ingredients.length === 0) return 0;

  // Get ingredient costs
  const ingredientIds = ingredients.map(ing => ing.ingredient_id);
  const { data: ingredientData, error } = await supabase
    .from('ingredients')
    .select('id, cost_per_unit')
    .in('id', ingredientIds);

  if (error) {
    throw error;
  }

  const costMap = new Map(ingredientData.map(ing => [ing.id, ing.cost_per_unit]));

  return ingredients.reduce((total, ing) => {
    const costPerUnit = costMap.get(ing.ingredient_id) || 0;
    return total + (Number(ing.quantity || 0) * costPerUnit);
  }, 0);
}
