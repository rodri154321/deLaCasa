import React from 'react';
import { safeToFixed } from '../utils/formatters';
import type { Product } from '../services/database';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export default function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const isLowStock = product.current_stock <= product.minimum_stock;
  const activePresentations = (product.product_presentations || []).filter((presentation) => presentation.active !== false);

  return (
    <div className="card group">
      <div className="card-body">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">
              {product.name}
            </h3>
            {product.category && (
              <p className="text-sm text-amber-600 font-medium">{product.category}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {isLowStock && (
              <div className="badge-danger">Stock Bajo</div>
            )}
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              product.active
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {product.active ? 'Activo' : 'Inactivo'}
            </div>
          </div>
        </div>

        {product.description && (
          <p className="text-gray-600 mb-4 line-clamp-2">{product.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-3 rounded-xl">
            <p className="text-xs text-emerald-600 font-medium mb-1">Presentaciones</p>
            <p className="text-lg font-bold text-emerald-900">{activePresentations.length}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl">
            <p className="text-xs text-blue-600 font-medium mb-1">Costo Estimado</p>
            <p className="text-lg font-bold text-blue-900">${safeToFixed(product.estimated_cost)}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3 rounded-xl mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-amber-600 font-medium mb-1">Stock Actual</p>
              <p className={`text-lg font-bold ${isLowStock ? 'text-red-600' : 'text-amber-900'}`}>
                {product.current_stock} unid
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Mínimo</p>
              <p className="text-sm font-medium text-gray-700">{product.minimum_stock} unid</p>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs text-gray-500 mb-2">Presentaciones disponibles</p>
          {activePresentations.length > 0 ? (
            <div className="space-y-2">
              {activePresentations.map((presentation) => (
                <div key={presentation.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-gray-800">
                    {presentation.name} ({safeToFixed(presentation.quantity, 0)} unid)
                  </span>
                  <span className="font-bold text-amber-700">${safeToFixed(presentation.sale_price)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Sin presentaciones activas</p>
          )}
        </div>

        {product.sku && (
          <div className="mb-4 p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">SKU</p>
            <p className="text-sm font-mono text-gray-900">{product.sku}</p>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
          <button
            onClick={() => onEdit(product)}
            className="btn-ghost"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
