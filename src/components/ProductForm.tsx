import React, { useState, useEffect } from 'react';
import type { Product } from '../services/database';
import type { ProductPayload, PresentationPayload } from '../services/productService';

interface ProductFormProps {
  product?: Product;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: ProductPayload) => void;
  isLoading?: boolean;
}

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  active: boolean;
  show_in_catalog: boolean;
  sale_price: string;
  estimated_cost: string;
  current_stock: string;
  minimum_stock: string;
  production_time_minutes: string;
  units_per_batch: string;
  sku: string;
  notes: string;
  image_url: string;
}

interface ValidationErrors {
  name?: string;
  sale_price?: string;
  estimated_cost?: string;
  current_stock?: string;
  minimum_stock?: string;
  production_time_minutes?: string;
  units_per_batch?: string;
  presentations?: string;
}

type PresentationFormData = {
  id?: string;
  name: string;
  quantity: string;
  sale_price: string;
  active: boolean;
  show_in_catalog: boolean;
};

const defaultPresentation: PresentationFormData = {
  name: 'Unidad',
  quantity: '1',
  sale_price: '',
  active: true,
  show_in_catalog: true,
};

function toFormPresentations(product?: Product): PresentationFormData[] {
  const activePresentations = (product?.product_presentations || []).filter((presentation) => presentation.active !== false);

  if (activePresentations.length > 0) {
    return activePresentations.map((presentation) => ({
      id: presentation.id,
      name: presentation.name,
      quantity: String(presentation.quantity),
      sale_price: String(presentation.sale_price),
      active: presentation.active !== false,
      show_in_catalog: presentation.show_in_catalog !== false,
    }));
  }

  return [{
    ...defaultPresentation,
    sale_price: product ? String(product.sale_price || 0) : '',
  }];
}

function toSafeNumber(value: string, fallback = 0) {
  const parsed = Number(value || fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

interface ToggleSettingProps {
  checked: boolean;
  title: string;
  description: string;
  onChange: (checked: boolean) => void;
}

function ToggleSetting({ checked, title, description, onChange }: ToggleSettingProps) {
  return (
    <label className="group flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#D8C5AE] bg-white/80 p-4 transition-all duration-200 hover:border-[#6F7C4B]/45 hover:bg-white">
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[#344033]">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-gray-500">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span className="relative h-7 w-12 flex-shrink-0 rounded-full bg-[#D8C5AE] transition-colors duration-200 peer-checked:bg-[#6F7C4B] peer-focus-visible:ring-4 peer-focus-visible:ring-[#6F7C4B]/20">
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export default function ProductForm({ product, isOpen, onClose, onSubmit, isLoading = false }: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    category: '',
    active: true,
    show_in_catalog: true,
    sale_price: '',
    estimated_cost: '',
    current_stock: '0',
    minimum_stock: '0',
    production_time_minutes: '0',
    units_per_batch: '1',
    sku: '',
    notes: '',
    image_url: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [presentations, setPresentations] = useState<PresentationFormData[]>([defaultPresentation]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        category: product.category,
        active: product.active,
        show_in_catalog: product.show_in_catalog !== false,
        sale_price: product.sale_price.toString(),
        estimated_cost: product.estimated_cost.toString(),
        current_stock: product.current_stock.toString(),
        minimum_stock: product.minimum_stock.toString(),
        production_time_minutes: product.production_time_minutes.toString(),
        units_per_batch: product.units_per_batch.toString(),
        sku: product.sku,
        notes: product.notes,
        image_url: product.image_url,
      });
      setPresentations(toFormPresentations(product));
    } else {
      setFormData({
        name: '',
        description: '',
        category: '',
        active: true,
        show_in_catalog: true,
        sale_price: '',
        estimated_cost: '',
        current_stock: '0',
        minimum_stock: '0',
        production_time_minutes: '0',
        units_per_batch: '1',
        sku: '',
        notes: '',
        image_url: '',
      });
      setPresentations([{ ...defaultPresentation }]);
    }
    setErrors({});
  }, [product, isOpen]);

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del producto es requerido';
    }

    const salePrice = Number(formData.sale_price || 0);
    if (isNaN(salePrice) || salePrice < 0) {
      newErrors.sale_price = 'El precio de venta debe ser un número mayor o igual a 0';
    }

    const estimatedCost = Number(formData.estimated_cost || 0);
    if (isNaN(estimatedCost) || estimatedCost < 0) {
      newErrors.estimated_cost = 'El costo estimado debe ser un número mayor o igual a 0';
    }

    const currentStock = Number(formData.current_stock || 0);
    if (isNaN(currentStock) || currentStock < 0) {
      newErrors.current_stock = 'El stock actual no puede ser negativo';
    }

    const minimumStock = Number(formData.minimum_stock || 0);
    if (isNaN(minimumStock) || minimumStock < 0) {
      newErrors.minimum_stock = 'El stock mínimo no puede ser negativo';
    }

    const productionTime = Number(formData.production_time_minutes || 0);
    if (isNaN(productionTime) || productionTime < 0) {
      newErrors.production_time_minutes = 'El tiempo de producción no puede ser negativo';
    }

    const unitsPerBatch = Number(formData.units_per_batch || 0);
    if (isNaN(unitsPerBatch) || unitsPerBatch < 0) {
      newErrors.units_per_batch = 'Las unidades por lote no pueden ser negativas';
    }

    if (presentations.length === 0) {
      newErrors.presentations = 'Agrega al menos una presentación de venta';
    }

    const invalidPresentation = presentations.find((presentation) => {
      const name = presentation.name.trim();
      const quantity = Number(presentation.quantity);
      const salePrice = Number(presentation.sale_price || 0);

      return !name || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(salePrice) || salePrice < 0;
    });

    if (invalidPresentation) {
      newErrors.presentations = 'Cada presentación necesita nombre, cantidad mayor a 0 y precio mayor o igual a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      try {
        const normalizedPresentations: PresentationPayload[] = presentations.map((presentation) => ({
          id: presentation.id,
          name: presentation.name.trim(),
          quantity: toSafeNumber(presentation.quantity, 1),
          sale_price: toSafeNumber(presentation.sale_price, 0),
          active: presentation.active,
          show_in_catalog: presentation.show_in_catalog,
        }));

        await onSubmit({
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category.trim(),
          active: formData.active,
          show_in_catalog: formData.show_in_catalog,
          sale_price: Number(formData.sale_price || 0),
          estimated_cost: Number(formData.estimated_cost || 0),
          current_stock: Number(formData.current_stock || 0),
          minimum_stock: Number(formData.minimum_stock || 0),
          production_time_minutes: Number(formData.production_time_minutes || 0),
          units_per_batch: Number(formData.units_per_batch || 0),
          sku: formData.sku.trim(),
          notes: formData.notes.trim(),
          image_url: formData.image_url.trim(),
          product_presentations: normalizedPresentations,
        });
        onClose();
      } catch (error) {
        console.error('Product submit failed:', error);
      }
    }
  };

  const handleChange = (field: keyof ProductFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCheckboxChange = (field: keyof ProductFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.checked }));
  };

  const handlePresentationCheckboxChange = (
    index: number,
    field: 'active' | 'show_in_catalog',
    checked: boolean
  ) => {
    setPresentations((current) =>
      current.map((presentation, presentationIndex) =>
        presentationIndex === index ? { ...presentation, [field]: checked } : presentation
      )
    );
  };

  const handlePresentationChange = (
    index: number,
    field: keyof PresentationFormData,
    value: string
  ) => {
    setPresentations((current) =>
      current.map((presentation, presentationIndex) =>
        presentationIndex === index ? { ...presentation, [field]: value } : presentation
      )
    );

    if (errors.presentations) {
      setErrors((prev) => ({ ...prev, presentations: undefined }));
    }
  };

  const addPresentation = () => {
    setPresentations((current) => [
      ...current,
      { name: '', quantity: '1', sale_price: '0', active: true, show_in_catalog: true },
    ]);
  };

  const removePresentation = (index: number) => {
    setPresentations((current) => current.filter((_, presentationIndex) => presentationIndex !== index));
  };

  const hasValidPresentations = presentations.length > 0 && presentations.every((presentation) => {
    const quantity = Number(presentation.quantity);
    const salePrice = Number(presentation.sale_price || 0);

    return presentation.name.trim() && Number.isFinite(quantity) && quantity > 0 && Number.isFinite(salePrice) && salePrice >= 0;
  });

  const isValid = Boolean(formData.name.trim()) && hasValidPresentations && !Object.values(errors).some(error => error);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="text-2xl font-bold text-gray-900">
            {product ? 'Editar Producto' : 'Crear Producto'}
          </h2>
          <button
            onClick={onClose}
            className="btn-ghost"
            type="button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
                  placeholder="Ej: Alfajor Maicena Chico"
                  required
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <input
                  type="text"
                  id="category"
                  value={formData.category}
                  onChange={handleChange('category')}
                  className="form-input"
                  placeholder="Ej: Alfajores"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={handleChange('description')}
                rows={3}
                className="form-input"
                placeholder="Descripción del producto"
              />
            </div>

            {/* Sales */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Ventas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="sale_price" className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Base / Referencia *
                  </label>
                  <input
                    type="number"
                    id="sale_price"
                    value={formData.sale_price}
                    onChange={handleChange('sale_price')}
                    min="0"
                    step="0.01"
                    className={`form-input ${
                      errors.sale_price ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    required
                  />
                  {errors.sale_price && <p className="text-red-500 text-sm mt-1">{errors.sale_price}</p>}
                </div>

                <div>
                  <label htmlFor="estimated_cost" className="block text-sm font-medium text-gray-700 mb-1">
                    Costo Estimado *
                  </label>
                  <input
                    type="number"
                    id="estimated_cost"
                    value={formData.estimated_cost}
                    onChange={handleChange('estimated_cost')}
                    min="0"
                    step="0.01"
                    className={`form-input ${
                      errors.estimated_cost ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    required
                  />
                  {errors.estimated_cost && <p className="text-red-500 text-sm mt-1">{errors.estimated_cost}</p>}
                </div>
              </div>
            </div>

            {/* Presentations */}
            <div className="border-t pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium">Presentaciones de Venta</h3>
                  <p className="text-sm text-gray-600">Definen cómo se vende el producto. El stock sigue en unidades individuales.</p>
                </div>
                <button
                  type="button"
                  onClick={addPresentation}
                  className="btn-secondary"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Agregar Presentación
                </button>
              </div>

              <div className="space-y-3">
                {presentations.map((presentation, index) => (
                  <div key={presentation.id || index} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-start">
                      <div className="sm:col-span-2 lg:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre *
                        </label>
                        <input
                          type="text"
                          value={presentation.name}
                          onChange={(event) => handlePresentationChange(index, 'name', event.target.value)}
                          className="form-input"
                          placeholder="Ej: Docena"
                          required
                        />
                      </div>

                      <div className="sm:col-span-1 lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unidades *
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={presentation.quantity}
                          onChange={(event) => handlePresentationChange(index, 'quantity', event.target.value)}
                          className="form-input"
                          placeholder="12"
                          required
                        />
                      </div>

                      <div className="sm:col-span-1 lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Precio *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={presentation.sale_price}
                          onChange={(event) => handlePresentationChange(index, 'sale_price', event.target.value)}
                          className="form-input"
                          placeholder="0.00"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2 lg:col-span-10 rounded-2xl border border-[#D8C5AE] bg-[#F5EEE4] p-3">
                        <div className="flex flex-col gap-3 md:flex-row">
                          <ToggleSetting
                            checked={presentation.active}
                            title="Presentación activa"
                            description="Disponible para ventas"
                            onChange={(checked) => handlePresentationCheckboxChange(index, 'active', checked)}
                          />
                          <ToggleSetting
                            checked={presentation.show_in_catalog}
                            title="Mostrar en catálogo público"
                            description="Visible en la carta pública"
                            onChange={(checked) => handlePresentationCheckboxChange(index, 'show_in_catalog', checked)}
                          />
                        </div>
                      </div>

                      <div className="hidden">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={presentation.active}
                            onChange={(event) => handlePresentationCheckboxChange(index, 'active', event.target.checked)}
                          />
                          <span className="text-sm font-medium text-gray-700">PresentaciÃ³n activa</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={presentation.show_in_catalog}
                            onChange={(event) => handlePresentationCheckboxChange(index, 'show_in_catalog', event.target.checked)}
                          />
                          <span className="text-sm font-medium text-gray-700">Mostrar en catÃ¡logo pÃºblico</span>
                        </label>
                      </div>

                      <div className="sm:col-span-2 lg:col-span-2 flex justify-end lg:pt-7">
                        <button
                          type="button"
                          onClick={() => removePresentation(index)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                          disabled={presentations.length === 1}
                          title="Eliminar presentación"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Quitar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {errors.presentations && <p className="text-red-500 text-sm mt-2">{errors.presentations}</p>}
            </div>

            {/* Stock */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Stock</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className={`form-input ${
                      errors.current_stock ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
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
                    className={`form-input ${
                      errors.minimum_stock ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {errors.minimum_stock && <p className="text-red-500 text-sm mt-1">{errors.minimum_stock}</p>}
                </div>
              </div>
            </div>

            {/* Production */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Producción</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="production_time_minutes" className="block text-sm font-medium text-gray-700 mb-1">
                    Tiempo de Producción (minutos)
                  </label>
                  <input
                    type="number"
                    id="production_time_minutes"
                    value={formData.production_time_minutes}
                    onChange={handleChange('production_time_minutes')}
                    min="0"
                    className="form-input"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label htmlFor="units_per_batch" className="block text-sm font-medium text-gray-700 mb-1">
                    Unidades por Lote
                  </label>
                  <input
                    type="number"
                    id="units_per_batch"
                    value={formData.units_per_batch}
                    onChange={handleChange('units_per_batch')}
                    min="1"
                    className="form-input"
                    placeholder="1"
                  />
                </div>
              </div>
            </div>

            {/* Optional */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Información Adicional</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    id="sku"
                    value={formData.sku}
                    onChange={handleChange('sku')}
                    className="form-input"
                    placeholder="Código SKU"
                  />
                </div>

                <div>
                  <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-1">
                    URL de Imagen
                  </label>
                  <input
                    type="url"
                    id="image_url"
                    value={formData.image_url}
                    onChange={handleChange('image_url')}
                    className="form-input"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#D8C5AE] bg-[#F5EEE4] p-4">
                <div className="flex flex-col gap-3 md:flex-row">
                  <ToggleSetting
                    checked={formData.active}
                    title="Producto activo"
                    description="Visible en el sistema interno"
                    onChange={(checked) => setFormData((prev) => ({ ...prev, active: checked }))}
                  />
                  <ToggleSetting
                    checked={formData.show_in_catalog}
                    title="Mostrar en catálogo público"
                    description="Visible en la carta pública"
                    onChange={(checked) => setFormData((prev) => ({ ...prev, show_in_catalog: checked }))}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={handleChange('notes')}
                  rows={3}
                  className="form-input"
                  placeholder="Notas adicionales"
                />
              </div>

              <div className="hidden">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={handleCheckboxChange('active')}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Producto activo</span>
                </label>
              </div>

              <div className="hidden">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.show_in_catalog}
                    onChange={handleCheckboxChange('show_in_catalog')}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Mostrar en catÃ¡logo pÃºblico</span>
                </label>
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
                className="btn-primary"
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  product ? 'Actualizar Producto' : 'Crear Producto'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
