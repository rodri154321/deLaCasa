import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { safeToFixed } from '../utils/formatters';
import type { Recipe, RecipeIngredient, Product, Ingredient } from '../services/database';

interface RecipeFormProps {
  recipe?: Recipe & {
    products?: { id: string; name: string };
    recipe_ingredients?: Array<{
      id: string;
      quantity: number;
      ingredients?: {
        id: string;
        name: string;
        unit: string;
        cost_per_unit: number;
      };
    }>;
  };
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>, ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id'>[]) => void;
  isLoading?: boolean;
}

interface RecipeFormData {
  name: string;
  product_id: string;
  notes: string;
}

interface RecipeIngredientRow {
  id: string; // temporary ID for UI management
  ingredient_id: string;
  quantity: string;
}

interface ValidationErrors {
  name?: string;
  product_id?: string;
  ingredients?: string;
  duplicates?: string;
}

export default function RecipeForm({ recipe, isOpen, onClose, onSubmit, isLoading = false }: RecipeFormProps) {
  const products = useAppStore((state) => state.products);
  const ingredients = useAppStore((state) => state.stock);

  const [formData, setFormData] = useState<RecipeFormData>({
    name: '',
    product_id: '',
    notes: '',
  });

  const [ingredientRows, setIngredientRows] = useState<RecipeIngredientRow[]>([
    { id: '1', ingredient_id: '', quantity: '0' }
  ]);

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [nextId, setNextId] = useState(2);

  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name,
        product_id: recipe.product_id,
        notes: recipe.notes,
      });

      // If we have recipe_ingredients, populate them
      const existingIngredients = recipe.recipe_ingredients || [];
      if (existingIngredients.length > 0) {
        const rows: RecipeIngredientRow[] = existingIngredients.map((ri, index: number) => ({
          id: (index + 1).toString(),
          ingredient_id: ri.ingredients?.id || '',
          quantity: ri.quantity.toString(),
        }));
        setIngredientRows(rows);
        setNextId(rows.length + 1);
      } else {
        setIngredientRows([{ id: '1', ingredient_id: '', quantity: '0' }]);
        setNextId(2);
      }
    } else {
      setFormData({
        name: '',
        product_id: '',
        notes: '',
      });
      setIngredientRows([{ id: '1', ingredient_id: '', quantity: '0' }]);
      setNextId(2);
    }
    setErrors({});
  }, [recipe, isOpen]);

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre de la receta es requerido';
    }

    if (!formData.product_id) {
      newErrors.product_id = 'Debe seleccionar un producto';
    }

    const validIngredients = ingredientRows.filter(row =>
      row.ingredient_id && Number(row.quantity || 0) > 0
    );

    if (validIngredients.length === 0) {
      newErrors.ingredients = 'Debe agregar al menos un ingrediente con cantidad mayor a 0';
    }

    // Check for duplicate ingredients
    const ingredientIds = validIngredients.map(row => row.ingredient_id);
    const uniqueIds = new Set(ingredientIds);
    if (uniqueIds.size !== ingredientIds.length) {
      newErrors.duplicates = 'No se permiten ingredientes duplicados';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateTotalCost = (): number => {
    return ingredientRows.reduce((total, row) => {
      if (!row.ingredient_id || !row.quantity) return total;

      const ingredient = ingredients.find(i => i.id === row.ingredient_id);
      const quantity = Number(row.quantity || 0);
      const costPerUnit = ingredient?.cost_per_unit || 0;

      return total + (quantity * costPerUnit);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const validIngredients = ingredientRows
        .filter(row => row.ingredient_id && Number(row.quantity || 0) > 0)
        .map(row => ({
          ingredient_id: row.ingredient_id,
          quantity: Number(row.quantity || 0),
        }));

      try {
        await onSubmit(
          {
            name: formData.name.trim(),
            product_id: formData.product_id,
            notes: formData.notes.trim(),
            estimated_cost: calculateTotalCost(),
          },
          validIngredients
        );
        onClose();
      } catch (error) {
        console.error('Recipe submit failed:', error);
      }
    }
  };

  const handleChange = (field: keyof RecipeFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleIngredientChange = (rowId: string, field: keyof RecipeIngredientRow, value: string) => {
    setIngredientRows(prev => prev.map(row =>
      row.id === rowId ? { ...row, [field]: value } : row
    ));

    // Clear ingredient errors
    if (errors.ingredients || errors.duplicates) {
      setErrors(prev => ({ ...prev, ingredients: undefined, duplicates: undefined }));
    }
  };

  const addIngredientRow = () => {
    setIngredientRows(prev => [
      ...prev,
      { id: nextId.toString(), ingredient_id: '', quantity: '0' }
    ]);
    setNextId(prev => prev + 1);
  };

  const removeIngredientRow = (rowId: string) => {
    if (ingredientRows.length > 1) {
      setIngredientRows(prev => prev.filter(row => row.id !== rowId));
    }
  };

  const availableIngredients = ingredients;

  const totalCost = calculateTotalCost();
  const isValid = Boolean(formData.name.trim() && formData.product_id && products.length > 0 && ingredients.length > 0) && !Object.values(errors).some(error => error);

  // Show loading state if data is not loaded yet
  const isDataLoading = products.length === 0 || ingredients.length === 0;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl">
        <div className="modal-header">
          <h2 className="text-2xl font-bold text-[#344033]">
            {recipe ? 'Editar Receta' : 'Crear Receta'}
          </h2>
          <button onClick={onClose} className="btn-ghost" type="button">
            Cerrar
          </button>
        </div>

        <div className="modal-body">
          {isDataLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8e9a6d] border-t-transparent mx-auto mb-4"></div>
                <p className="text-[#6b7c54]">Cargando datos...</p>
              </div>
            </div>
          )}

          {!isDataLoading && (
            <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Receta *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={handleChange('name')}
                  className={`form-input ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: Alfajor Maicena Clásico"
                  required
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="product_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Producto *
                </label>
                <select
                  id="product_id"
                  value={formData.product_id}
                  onChange={handleChange('product_id')}
                  className={`form-input ${
                    errors.product_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">
                    {products.length === 0 ? 'Cargando productos...' : 'Seleccionar producto'}
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                {errors.product_id && <p className="text-red-500 text-sm mt-1">{errors.product_id}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={handleChange('notes')}
                rows={3}
                className="form-input"
                placeholder="Instrucciones especiales o notas sobre la receta"
              />
            </div>

            {/* Ingredients */}
            <div className="border-t pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h3 className="text-lg font-bold text-[#344033]">Ingredientes</h3>
                <button
                  type="button"
                  onClick={addIngredientRow}
                  className="btn-secondary"
                >
                  Agregar Ingrediente
                </button>
              </div>

              {errors.ingredients && <p className="text-red-500 text-sm mb-4">{errors.ingredients}</p>}
              {errors.duplicates && <p className="text-red-500 text-sm mb-4">{errors.duplicates}</p>}

              <div className="space-y-3 mb-4">
                {ingredientRows.map((row, index) => {
                  const selectedIngredient = ingredients.find(i => i.id === row.ingredient_id);
                  const subtotal = selectedIngredient ?
                    Number(row.quantity || 0) * selectedIngredient.cost_per_unit : 0;

                  return (
                    <div key={row.id} className="grid grid-cols-1 gap-3 rounded-xl border border-[#e3e8d6] bg-[#fbfaf5] p-3 md:grid-cols-[minmax(0,1fr)_8rem_5rem_6rem_auto] md:items-center">
                      <div className="flex-1">
                        <select
                          value={row.ingredient_id}
                          onChange={(e) => handleIngredientChange(row.id, 'ingredient_id', e.target.value)}
                          className="form-input"
                        >
                          <option value="">
                            {ingredients.length === 0 ? 'Cargando ingredientes...' : 'Seleccionar ingrediente'}
                          </option>
                          {availableIngredients.map((ingredient) => (
                            <option key={ingredient.id} value={ingredient.id}>
                              {ingredient.name} ({ingredient.unit}) - Stock: {safeToFixed(ingredient.current_stock)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-32">
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={(e) => handleIngredientChange(row.id, 'quantity', e.target.value)}
                          min="0"
                          step="0.01"
                          className="form-input"
                          placeholder="0.00"
                        />
                      </div>

                      <div className="text-left md:text-center">
                        <span className="text-sm text-gray-600">
                          {selectedIngredient?.unit || 'unid'}
                        </span>
                      </div>

                      <div className="text-left md:text-right">
                        <span className="text-sm font-medium">
                          ${safeToFixed(subtotal)}
                        </span>
                      </div>

                      {ingredientRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredientRow(row.id)}
                          className="rounded-xl px-3 py-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Cost Summary */}
              <div className="rounded-2xl border border-[#d7dec4] bg-[#edf3e4] p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Costo Total Estimado:</span>
                  <span className="text-xl font-bold text-[#344033]">
                    ${safeToFixed(totalCost)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isValid || isLoading}
                className={`btn-primary ${
                  isValid && !isLoading
                    ? ''
                    : 'cursor-not-allowed opacity-60'
                }`}
              >
                {isLoading ? 'Guardando...' : (recipe ? 'Actualizar Receta' : 'Crear Receta')}
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
