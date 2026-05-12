import React from 'react';
import { safeToFixed } from '../utils/formatters';
import type { Ingredient } from '../services/database';

interface IngredientCardProps {
  ingredient: Ingredient;
  onEdit: (ingredient: Ingredient) => void;
  onDelete: (id: string) => void;
}

export default function IngredientCard({ ingredient, onEdit, onDelete }: IngredientCardProps) {
  const isLowStock = ingredient.current_stock <= ingredient.minimum_stock;

  return (
    <div className={`card p-5 ${isLowStock ? 'border-red-200 bg-red-50/70' : ''}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-[#344033]">{ingredient.name}</h3>
        <div className="flex flex-wrap justify-end gap-2">
          {isLowStock && <span className="badge-danger">Stock Bajo</span>}
          <span className="badge-info">{ingredient.unit}</span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-[#f8f4ea] p-3">
          <p className="text-sm font-semibold text-[#6b7c54]">Stock Actual</p>
          <p className={`text-lg font-bold ${isLowStock ? 'text-red-600' : 'text-[#344033]'}`}>
            {safeToFixed(ingredient.current_stock)}
          </p>
        </div>
        <div className="rounded-xl bg-[#edf3e4] p-3">
          <p className="text-sm font-semibold text-[#6b7c54]">Stock Minimo</p>
          <p className="text-lg font-bold text-[#344033]">
            {safeToFixed(ingredient.minimum_stock)}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-semibold text-[#6b7c54]">Costo por Unidad</p>
        <p className="text-lg font-bold text-[#344033]">
          ${safeToFixed(ingredient.cost_per_unit)}
        </p>
      </div>

      {ingredient.supplier && (
        <div className="mb-3">
          <p className="text-sm font-semibold text-[#6b7c54]">Proveedor</p>
          <p className="text-sm font-medium text-[#344033]">{ingredient.supplier}</p>
        </div>
      )}

      {ingredient.notes && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-[#6b7c54]">Notas</p>
          <p className="text-sm text-[#344033]">{ingredient.notes}</p>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-[#e3e8d6] pt-4">
        <button onClick={() => onEdit(ingredient)} className="btn-ghost">
          Editar
        </button>
        <button
          onClick={() => onDelete(ingredient.id)}
          className="rounded-xl px-3 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
