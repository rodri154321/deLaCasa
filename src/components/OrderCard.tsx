import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { safeToFixed } from '../utils/formatters';
import type { Order, OrderStatus, PaymentStatus, PaymentMethod } from '../services/database';

interface OrderCardProps {
  order: Order;
  onRefresh: () => void;
}

export default function OrderCard({ order, onRefresh }: OrderCardProps) {
  const updateOrderStatus = useAppStore((state) => state.updateOrderStatus);
  const updatePaymentStatus = useAppStore((state) => state.updatePaymentStatus);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-200 group">
      {/* Collapsed Header */}
      <div className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 sm:space-x-0 sm:ml-4">
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
          <div className="flex flex-wrap gap-2 mb-4">
            {order.status === 'pending' && (
              <button
                onClick={() => handleStatusChange('preparing')}
                disabled={isUpdating}
                className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
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
                className="px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
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
                className="px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-semibold rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
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
                className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">ID de Orden:</span>
                  <span className="text-sm font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">{order.id.slice(-8)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Total:</span>
                  <span className="text-lg font-bold text-amber-600">${safeToFixed(order.total_amount)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Creada:</span>
                  <span className="text-sm text-gray-800">{new Date(order.created_at).toLocaleString('es-ES')}</span>
                </div>
                <div className="flex items-center justify-between">
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

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-blue-500 mt-0.5">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-800 font-medium">Próximamente</p>
                  <p className="text-xs text-blue-600 mt-1">Los detalles completos de productos estarán disponibles en futuras actualizaciones del sistema.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}