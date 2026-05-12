import React, { useState, useEffect } from 'react';
import type { Ingredient } from '../services/database';

interface IngredientFormProps {
  ingredient?: Ingredient;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ingredient: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>) => void;
  isLoading?: boolean;
}

const UNIT_OPTIONS = [
  { value: 'g', label: 'Gramos (g)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'units', label: 'Unidades' },
];

interface IngredientFormData {
  name: string;
  current_stock: string;
  minimum_stock: string;
  unit: string;
  cost_per_unit: string;
  supplier: string;
  notes: string;
}

interface ValidationErrors {
  name?: string;
  current_stock?: string;
  minimum_stock?: string;
  cost_per_unit?: string;
}

export default function IngredientForm({ ingredient, isOpen, onClose, onSubmit, isLoading = false }: IngredientFormProps) {
  const [formData, setFormData] = useState<IngredientFormData>({
    name: '',
    current_stock: '0',
    minimum_stock: '0',
    unit: 'g',
    cost_per_unit: '0.00',
    supplier: '',
    notes: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    if (ingredient) {
      setFormData({
        name: ingredient.name,
        current_stock: ingredient.current_stock.toString(),
        minimum_stock: ingredient.minimum_stock.toString(),
        unit: ingredient.unit,
        cost_per_unit: ingredient.cost_per_unit.toString(),
        supplier: ingredient.supplier,
        notes: ingredient.notes,
      });
    } else {
      setFormData({
        name: '',
        current_stock: '0',
        minimum_stock: '0',
        unit: 'g',
        cost_per_unit: '0.00',
        supplier: '',
        notes: '',
      });
    }
    setErrors({});
  }, [ingredient, isOpen]);

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del ingrediente es requerido';
    }

    const currentStock = Number(formData.current_stock || 0);
    if (isNaN(currentStock) || currentStock < 0) {
      newErrors.current_stock = 'El stock actual debe ser un número mayor o igual a 0';
    }

    const minimumStock = Number(formData.minimum_stock || 0);
    if (isNaN(minimumStock) || minimumStock < 0) {
      newErrors.minimum_stock = 'El stock mínimo debe ser un número mayor o igual a 0';
    }

    const costPerUnit = Number(formData.cost_per_unit || 0);
    if (isNaN(costPerUnit) || costPerUnit < 0) {
      newErrors.cost_per_unit = 'El costo por unidad debe ser un número mayor o igual a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      try {
        await onSubmit({
          name: formData.name.trim(),
          current_stock: Number(formData.current_stock || 0),
          minimum_stock: Number(formData.minimum_stock || 0),
          unit: formData.unit,
          cost_per_unit: Number(formData.cost_per_unit || 0),
          supplier: formData.supplier.trim(),
          notes: formData.notes.trim(),
        });
        onClose();
      } catch (error) {
        console.error('Ingredient submit failed:', error);
      }
    }
  };

  const handleChange = (field: keyof IngredientFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const isValid = Boolean(formData.name.trim() && formData.unit) && !Object.values(errors).some(error => error);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <div className="modal-header">
          <h2 className="text-2xl font-bold text-[#344033]">
            {ingredient ? 'Editar Ingrediente' : 'Crear Ingrediente'}
          </h2>
          <button onClick={onClose} className="btn-ghost" type="button">
            Cerrar
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={handleChange('name')}
                  className={`form-input ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: Harina 0000"
                  required
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad
                </label>
                <select
                  id="unit"
                  value={formData.unit}
                  onChange={handleChange('unit')}
                  className="form-input"
                >
                  {UNIT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stock */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="current_stock" className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Actual
                </label>
                <input
                  type="number"
                  id="current_stock"
                  value={formData.current_stock}
                  onChange={handleChange('current_stock')}
                  min="0"
                  step="0.01"
                  className={`form-input ${
                    errors.current_stock ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.current_stock && <p className="text-red-500 text-sm mt-1">{errors.current_stock}</p>}
              </div>

              <div>
                <label htmlFor="minimum_stock" className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  id="minimum_stock"
                  value={formData.minimum_stock}
                  onChange={handleChange('minimum_stock')}
                  min="0"
                  step="0.01"
                  className={`form-input ${
                    errors.minimum_stock ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.minimum_stock && <p className="text-red-500 text-sm mt-1">{errors.minimum_stock}</p>}
              </div>

              <div>
                <label htmlFor="cost_per_unit" className="block text-sm font-medium text-gray-700 mb-1">
                  Costo por Unidad
                </label>
                <input
                  type="number"
                  id="cost_per_unit"
                  value={formData.cost_per_unit}
                  onChange={handleChange('cost_per_unit')}
                  min="0"
                  step="0.01"
                  className={`form-input ${
                    errors.cost_per_unit ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.cost_per_unit && <p className="text-red-500 text-sm mt-1">{errors.cost_per_unit}</p>}
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
                  Proveedor
                </label>
                <input
                  type="text"
                  id="supplier"
                  value={formData.supplier}
                  onChange={handleChange('supplier')}
                  className="form-input"
                  placeholder="Nombre del proveedor"
                />
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
                placeholder="Notas adicionales sobre el ingrediente"
              />
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
                {isLoading ? 'Guardando...' : (ingredient ? 'Actualizar Ingrediente' : 'Crear Ingrediente')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
