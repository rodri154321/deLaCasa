import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { safeToFixed } from '../utils/formatters';
import type { Order, OrderStatus, PaymentStatus, PaymentMethod } from '../services/database';

interface OrderCardProps {
  order: Order;
  onRefresh: () => void;
}

export default function OrderCard({ order, onRefresh }: OrderCardProps) {
  const products = useAppStore((state) => state.products);
  const addOrderItem = useAppStore((state) => state.addOrderItem);
  const updateOrderItem = useAppStore((state) => state.updateOrderItem);
  const deleteOrderItem = useAppStore((state) => state.deleteOrderItem);
  const updateOrderStatus = useAppStore((state) => state.updateOrderStatus);
  const updatePaymentStatus = useAppStore((state) => state.updatePaymentStatus);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedPresentation, setSelectedPresentation] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (newStatus === order.status) return;

    setIsUpdating(true);
    try {
      await updateOrderStatus(order.id, newStatus);
      onRefresh();
    } catch (error) {
      console.error('Failed to update order status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentStatusChange = async (newPaymentStatus: PaymentStatus) => {
    if (newPaymentStatus === order.payment_status) return;

    setIsUpdating(true);
    try {
      await updatePaymentStatus(order.id, newPaymentStatus);
      onRefresh();
    } catch (error) {
      console.error('Failed to update payment status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentMethodChange = async (paymentMethod: PaymentMethod) => {
    setIsUpdating(true);
    try {
      await updatePaymentStatus(order.id, order.payment_status, paymentMethod);
      onRefresh();
    } catch (error) {
      console.error('Failed to update payment method:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'delivered': return 'Entregada';
      case 'pending': return 'Pendiente';
      case 'preparing': return 'Preparando';
      case 'ready': return 'Lista';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getPaymentStatusText = (status: PaymentStatus) => {
    switch (status) {
      case 'paid': return 'Pagada';
      case 'partial': return 'Parcial';
      case 'unpaid': return 'Impaga';
      default: return status;
    }
  };

  const getPaymentMethodIcon = (method?: PaymentMethod) => {
    switch (method) {
      case 'cash': return '💵';
      case 'transfer': return '🏦';
      case 'debit': return '💳';
      case 'credit': return '💳';
      case 'mercadopago': return '📱';
      default: return '💰';
    }
  };

  const handleAddItem = async () => {
    if (!selectedProduct || !selectedPresentation) return;
    setIsUpdating(true);
    try {
      await addOrderItem(order.id, {
        product_id: selectedProduct,
        presentation_id: selectedPresentation,
        quantity: itemQuantity,
        unit_price: products.find(p => p.id === selectedProduct)?.product_presentations?.find((pp: any) => pp.id === selectedPresentation)?.sale_price || 0,
      });
      setShowAddItem(false);
      setSelectedProduct('');
      setSelectedPresentation('');
      setItemQuantity(1);
      onRefresh();
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return;
    setIsUpdating(true);
    try {
      await updateOrderItem(itemId, newQuantity);
      setEditingItemId(null);
      onRefresh();
    } catch (error) {
      console.error('Failed to update quantity:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('¿Eliminar este producto de la orden?')) return;
    setIsUpdating(true);
    try {
      await deleteOrderItem(itemId, order.id);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete item:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getPresentationsForProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.product_presentations || [];
  };

  const getUnitPrice = (presentationId: string) => {
    for (const p of products) {
      const pp = p.product_presentations?.find((pr: any) => pr.id === presentationId);
      if (pp) return pp.sale_price || 0;
    }
    return 0;
  };

  const orderItems = (order as any).order_items || [];

  return (
    <div className="w-full min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-200 group">
      {/* Collapsed Header */}
      <div className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 min-w-0">
          <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
            <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-2 md:p-3 rounded-xl group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">{order.customer_name}</h3>
              <p className="text-xs md:text-sm text-gray-600">
                #{order.id.slice(-8)} • {new Date(order.created_at).toLocaleDateString('es-ES')}
              </p>
              {order.customer_email && (
                <p className="text-xs text-gray-500 truncate">{order.customer_email}</p>
              )}
            </div>
          </div>

          {/* Mobile: Stack vertically, Desktop: Horizontal */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3 sm:space-x-0 sm:ml-4">
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <p className="text-lg md:text-xl font-bold text-amber-600">${safeToFixed(order.total_amount)}</p>

              {/* Expand Button - Mobile first */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs md:text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200 flex items-center space-x-1 flex-shrink-0"
              >
                <span>{isExpanded ? 'Ocultar' : 'Ver detalles'}</span>
                <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Status Badges - Wrap properly */}
            <div className="flex flex-wrap items-center gap-1 md:gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${getStatusColor(order.status)} transition-all duration-200 hover:shadow-md`}>
                {getStatusText(order.status)}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${getPaymentStatusColor(order.payment_status)} transition-all duration-200 hover:shadow-md`}>
                {getPaymentStatusText(order.payment_status)}
              </span>
              {order.payment_method && (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-md flex items-center gap-1">
                  <span className="text-sm">{getPaymentMethodIcon(order.payment_method)}</span>
                  <span className="hidden md:inline capitalize">{order.payment_method}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-4 md:p-6 border-t border-gray-100 bg-gradient-to-br from-gray-50 to-blue-50/30 animate-in slide-in-from-top-2 duration-300">
          {isUpdating && (
            <div className="flex items-center justify-center mb-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"></div>
            </div>
          )}

          {/* Editable Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4">
            {/* Order Status */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">Estado del Pedido</label>
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                disabled={isUpdating}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="pending">⏳ Pendiente</option>
                <option value="preparing">👨‍🍳 Preparando</option>
                <option value="ready">✅ Lista</option>
                <option value="delivered">🚚 Entregada</option>
                <option value="cancelled">❌ Cancelada</option>
              </select>
            </div>

            {/* Payment Status */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">Estado del Pago</label>
              <select
                value={order.payment_status}
                onChange={(e) => handlePaymentStatusChange(e.target.value as PaymentStatus)}
                disabled={isUpdating}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="unpaid">❌ Impaga</option>
                <option value="partial">⚠️ Parcial</option>
                <option value="paid">✅ Pagada</option>
              </select>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">Método de Pago</label>
              <select
                value={order.payment_method || ''}
                onChange={(e) => handlePaymentMethodChange(e.target.value as PaymentMethod)}
                disabled={isUpdating}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">💰 Seleccionar método</option>
                <option value="cash">💵 Efectivo</option>
                <option value="transfer">🏦 Transferencia</option>
                <option value="debit">💳 Débito</option>
                <option value="credit">💳 Crédito</option>
                <option value="mercadopago">📱 MercadoPago</option>
              </select>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-2 mb-4 sm:flex sm:flex-wrap">
            {order.status === 'pending' && (
              <button
                onClick={() => handleStatusChange('preparing')}
                disabled={isUpdating}
                className="w-full sm:w-auto px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
              >
                <span className="hidden sm:inline flex items-center gap-1.5">
                  <span>👨‍🍳</span>
                  <span>Iniciar Preparación</span>
                </span>
                <span className="sm:hidden flex items-center gap-1">
                  <span>👨‍🍳</span>
                  <span>Preparar</span>
                </span>
              </button>
            )}
            {order.status === 'preparing' && (
              <button
                onClick={() => handleStatusChange('ready')}
                disabled={isUpdating}
                className="w-full sm:w-auto px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
              >
                <span className="hidden sm:inline flex items-center gap-1.5">
                  <span>✅</span>
                  <span>Marcar Lista</span>
                </span>
                <span className="sm:hidden flex items-center gap-1">
                  <span>✅</span>
                  <span>Lista</span>
                </span>
              </button>
            )}
            {order.status === 'ready' && (
              <button
                onClick={() => handleStatusChange('delivered')}
                disabled={isUpdating}
                className="w-full sm:w-auto px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-semibold rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
              >
                <span className="hidden sm:inline flex items-center gap-1.5">
                  <span>🚚</span>
                  <span>Marcar Entregada</span>
                </span>
                <span className="sm:hidden flex items-center gap-1">
                  <span>🚚</span>
                  <span>Entregar</span>
                </span>
              </button>
            )}
            {order.payment_status === 'unpaid' && (
              <button
                onClick={() => handlePaymentStatusChange('paid')}
                disabled={isUpdating}
                className="w-full sm:w-auto px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
              >
                <span className="hidden sm:inline flex items-center gap-1.5">
                  <span>💰</span>
                  <span>Marcar Pagada</span>
                </span>
                <span className="sm:hidden flex items-center gap-1">
                  <span>💰</span>
                  <span>Pagar</span>
                </span>
              </button>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4">
            {/* Order Items */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Productos</h4>
                <button
                  onClick={() => setShowAddItem(true)}
                  disabled={isUpdating}
                  className="text-xs bg-gradient-to-r from-amber-500 to-amber-600 text-white px-3 py-1.5 rounded-lg font-medium hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
                >
                  + Agregar producto
                </button>
              </div>

              {orderItems.length > 0 ? (
                <div className="space-y-2">
                  {orderItems.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.products?.name || 'Producto'} - {item.product_presentations?.name || ''}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                          <span>${safeToFixed(item.unit_price)}</span>
                          {editingItemId === item.id ? (
                            <input
                              type="number"
                              min="1"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                              onBlur={() => handleUpdateQuantity(item.id, editQuantity)}
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateQuantity(item.id, editQuantity)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditQuantity(item.quantity);
                              }}
                              className="font-semibold hover:text-amber-600 transition-colors"
                            >
                              {item.quantity} unidades
                            </button>
                          )}
                          <span className="font-semibold">${safeToFixed(item.subtotal || item.unit_price * item.quantity)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={isUpdating}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50 ml-2 p-1"
                        title="Eliminar producto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">Sin productos en esta orden</p>
              )}

              {/* Add Item Form */}
              {showAddItem && (
                <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select
                        value={selectedProduct}
                        onChange={(e) => setSelectedProduct(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Seleccionar producto</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <select
                        value={selectedPresentation}
                        onChange={(e) => setSelectedPresentation(e.target.value)}
                        disabled={!selectedProduct}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                      >
                        <option value="">Seleccionar presentación</option>
                        {getPresentationsForProduct(selectedProduct).map((pp: any) => (
                          <option key={pp.id} value={pp.id}>{pp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad</label>
                        <input
                          type="number"
                          min="1"
                          value={itemQuantity}
                          onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowAddItem(false)}
                          disabled={isUpdating}
                          className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleAddItem}
                          disabled={isUpdating || !selectedProduct || !selectedPresentation}
                          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg text-sm font-medium hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 transition-all duration-200"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Order Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-gray-600">ID de Orden:</span>
                  <span className="text-sm font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">{order.id.slice(-8)}</span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-gray-600">Total:</span>
                  <span className="text-lg font-bold text-amber-600">${safeToFixed(order.total_amount)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-gray-600">Creada:</span>
                  <span className="text-sm text-gray-800">{new Date(order.created_at).toLocaleString('es-ES')}</span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-gray-600">Actualizada:</span>
                  <span className="text-sm text-gray-800">{new Date(order.updated_at).toLocaleString('es-ES')}</span>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            {(order.delivered_at || order.paid_at) && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Eventos Importantes</h4>
                <div className="space-y-2">
                  {order.delivered_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-600">Entregada:</span>
                      <span className="font-medium text-gray-800">{new Date(order.delivered_at).toLocaleString('es-ES')}</span>
                    </div>
                  )}
                  {order.paid_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-gray-600">Pagada:</span>
                      <span className="font-medium text-gray-800">{new Date(order.paid_at).toLocaleString('es-ES')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
