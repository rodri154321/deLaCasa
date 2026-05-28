import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { OrderItemPayload } from '../services/database';
import { safeToFixed } from '../utils/formatters';

const initialItem: OrderItemPayload = {
  product_id: '',
  presentation_id: '',
  quantity: 1,
  unit_price: 0,
  unit_cost: 0,
  subtotal: 0,
  profit: 0,
};

export default function CreateOrderForm() {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [items, setItems] = useState<OrderItemPayload[]>([initialItem]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const products = useAppStore((state) => state.products);
  const loadProducts = useAppStore((state) => state.loadProducts);
  const addOrder = useAppStore((state) => state.addOrder);

  // Filter only active products
  const activeProducts = products.filter(product => product.active);
  const activePresentationOptions = activeProducts.flatMap((product) =>
    (product.product_presentations || [])
      .filter((presentation) => presentation.active !== false)
      .map((presentation) => ({ product, presentation }))
  );

  // Debug logging
  console.log('Active products:', activeProducts.length);
  console.log('Active presentation options:', activePresentationOptions.length);

  useEffect(() => {
    loadProducts().catch((error) => console.error(error));
  }, [loadProducts]);

  const handleItemChange = (index: number, field: keyof OrderItemPayload, value: string) => {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        if (field === 'presentation_id') {
          const option = activePresentationOptions.find(({ presentation }) => presentation.id === value);
          if (!option) {
            console.error('Presentation not found:', value);
            return item;
          }

          const unitPrice = Number(option.presentation.sale_price || 0);
          const unitCost = Number(option.product.estimated_cost || 0);
          const quantity = Number(item.quantity || 0);
          const subtotal = unitPrice * quantity;
          const profit = subtotal - (unitCost * quantity);

          console.log('Selected presentation:', option.presentation.name, 'Price:', unitPrice, 'Cost:', unitCost);

          return {
            ...item,
            product_id: option.product.id,
            presentation_id: value,
            unit_price: unitPrice,
            unit_cost: unitCost,
            subtotal: subtotal,
            profit: profit,
          };
        }

        if (field === 'quantity') {
          const quantity = Number(value);
          const unitPrice = Number(item.unit_price || 0);
          const unitCost = Number(item.unit_cost || 0);
          const subtotal = unitPrice * quantity;
          const profit = subtotal - (unitCost * quantity);

          return {
            ...item,
            quantity: quantity,
            subtotal: subtotal,
            profit: profit,
          };
        }

        return {
          ...item,
          [field]: field === 'quantity' ? Number(value) : value,
        };
      })
    );
  };

  const addLineItem = () => {
    setItems((current) => [...current, { ...initialItem }]);
  };

  const removeLineItem = (index: number) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const orderTotal = items.reduce((total, item) => {
    const product = products.find((p) => p.id === item.product_id);
    const presentation = product?.product_presentations?.find((p) => p.id === item.presentation_id);
    const price = presentation?.sale_price ?? 0;
    return total + price * item.quantity;
  }, 0);

  const isFormValid =
    customerName.trim().length > 0 &&
    items.every((item) => {
      const hasValidPresentation = activePresentationOptions.some(({ presentation }) => presentation.id === item.presentation_id);
      return item.product_id &&
             item.presentation_id &&
             item.quantity > 0 &&
             item.unit_price >= 0 &&
             hasValidPresentation;
    });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) {
      setMessage('Por favor complete todos los campos de artículos y seleccione una presentación.');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      console.log('Submitting order with items:', items);
      console.log('ORDER ITEMS PAYLOAD:', items);
      const orderId = await addOrder(customerName, customerEmail, items);
      setMessage(`Orden creada exitosamente: ${orderId}`);
      setCustomerName('');
      setCustomerEmail('');
      setItems([initialItem]);
    } catch (error: any) {
      console.error('Order creation failed:', error);
      const errorMessage = error?.message || 'Error desconocido al crear la orden';
      if (errorMessage.includes('stock')) {
        setMessage('No hay suficiente stock para completar la orden. Verifique las cantidades.');
      } else if (errorMessage.includes('Invalid') || errorMessage.includes('inactive')) {
        setMessage('Uno o más productos/presentaciones no están disponibles. Actualice la selección.');
      } else {
        setMessage(`Error al crear la orden: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-w-0 lg:max-w-4xl lg:mx-auto">
      <div className="card">
        <div className="card-header">
          <h2 className="text-2xl font-bold text-gray-900">Crear Nueva Orden</h2>
          <p className="text-gray-600">Agrega productos al carrito y procesa la orden</p>
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
            {/* Customer Information */}
            <div className="form-section">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Cliente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="form-label">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    className="form-input"
                    placeholder="Ej: María González"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    className="form-input"
                    placeholder="cliente@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="form-section">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Productos</h3>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="btn-secondary w-full sm:w-auto"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Agregar Producto
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => {
                  const selectedProduct = activeProducts.find(p => p.id === item.product_id);
                  const selectedPresentation = selectedProduct?.product_presentations?.find((presentation) => presentation.id === item.presentation_id);
                  const subtotal = selectedPresentation ? selectedPresentation.sale_price * item.quantity : 0;
                  const stockUnits = selectedPresentation ? selectedPresentation.quantity * item.quantity : 0;

                  return (
                    <div key={index} className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl p-3 sm:p-4 md:p-6 border border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md min-w-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 md:gap-4 items-end">
                        <div className="sm:col-span-2 lg:col-span-5">
                          <label className="form-label">
                            Presentación *
                          </label>
                          <select
                            value={item.presentation_id}
                            onChange={(event) => handleItemChange(index, 'presentation_id', event.target.value)}
                            className="form-input"
                            required
                          >
                            <option value="">Seleccionar presentación</option>
                            {activePresentationOptions.map(({ product, presentation }) => (
                              <option key={presentation.id} value={presentation.id}>
                                {product.name} → {presentation.name} ({safeToFixed(presentation.quantity, 0)} unid) - ${safeToFixed(presentation.sale_price)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-1 lg:col-span-3">
                          <label className="form-label">
                            Cantidad *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) => handleItemChange(index, 'quantity', event.target.value)}
                            className="form-input"
                            placeholder="1"
                            required
                          />
                        </div>

                        <div className="sm:col-span-1 lg:col-span-2">
                          <label className="form-label">
                            Precio Unit.
                          </label>
                          <div className="bg-white px-3 py-3 border border-gray-200 rounded-xl text-gray-900 font-medium">
                            ${selectedPresentation ? safeToFixed(selectedPresentation.sale_price) : '0.00'}
                          </div>
                        </div>

                        <div className="sm:col-span-2 lg:col-span-2">
                          <div className="flex items-center justify-between gap-3">
                            <label className="form-label">
                              Subtotal
                            </label>
                            <div className="text-right">
                              <span className="text-lg font-bold text-amber-600">
                                ${safeToFixed(subtotal)}
                              </span>
                              {selectedPresentation && (
                                <p className="text-xs text-gray-500">{safeToFixed(stockUnits, 0)} unid de stock</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {items.length > 1 && (
                          <div className="sm:col-span-2 lg:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeLineItem(index)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar producto"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 md:p-6 border border-amber-200">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Resumen de la Orden</h3>
                  <p className="text-gray-600">{items.length} producto{items.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Total a Pagar</p>
                  <p className="text-3xl font-bold text-amber-600">${safeToFixed(orderTotal)}</p>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className="btn-primary w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <div className="loading-spinner mr-2"></div>
                    Creando Orden...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Crear Orden
                  </>
                )}
              </button>
            </div>

            {/* Messages */}
            {message && (
              <div className={`rounded-xl p-4 ${
                message.includes('Error') || message.includes('Failed')
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}>
                <div className="flex items-center">
                  {message.includes('Error') || message.includes('Failed') ? (
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {message}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
