import React from 'react';
import { safeToFixed } from '../utils/formatters';
import type { Recipe } from '../services/database';

interface RecipeCardProps {
  recipe: Recipe & { products?: { id: string; name: string }; recipe_ingredients?: any[] };
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
}

export default function RecipeCard({ recipe, onEdit, onDelete }: RecipeCardProps) {
  const productName = (recipe as any).products?.name || 'Producto desconocido';
  const ingredientCount = (recipe as any).recipe_ingredients?.length || 0;

  return (
    <div className="card p-5">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-bold text-[#344033]">{recipe.name}</h3>
        <div className="text-right">
          <div className="text-sm text-[#6b7c54]">Producto</div>
          <div className="text-sm font-bold text-[#344033]">{productName}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl bg-[#edf3e4] p-3">
          <p className="text-sm font-semibold text-[#6b7c54]">Costo Estimado</p>
          <p className="text-lg font-bold text-[#344033]">
            ${safeToFixed(recipe.estimated_cost)}
          </p>
        </div>
        <div className="rounded-xl bg-[#f8f4ea] p-3">
          <p className="text-sm font-semibold text-[#6b7c54]">Ingredientes</p>
          <p className="text-lg font-bold text-[#344033]">
            {ingredientCount}
          </p>
        </div>
      </div>

      {recipe.notes && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-[#6b7c54]">Notas</p>
          <p className="text-sm text-[#344033] line-clamp-2">{recipe.notes}</p>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-[#e3e8d6] pt-4">
        <button
          onClick={() => onEdit(recipe)}
          className="btn-ghost"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(recipe.id)}
          className="rounded-xl px-3 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
