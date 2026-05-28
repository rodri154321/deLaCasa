import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { safeToFixed } from '../utils/formatters';
import type { DashboardOrder } from '../services/dashboardService';
import type { OrderStatus, PaymentStatus, PaymentMethod } from '../services/database';

interface DashboardOrderCardProps {
  order: DashboardOrder;
  onRefresh: () => void;
}

export default function DashboardOrderCard({ order, onRefresh }: DashboardOrderCardProps) {
  const updateOrderStatus = useAppStore((state) => state.updateOrderStatus);
  const updatePaymentStatus = useAppStore((state) => state.updatePaymentStatus);
  const [isUpdating, setIsUpdating] = useState(false);



  const handleMarkPaid = async () => {
    if (order.payment_status === 'paid') return;

    setIsUpdating(true);
    try {
      await updatePaymentStatus(order.id, 'paid');
      onRefresh();
    } catch (error) {
      console.error('Failed to update payment status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (order.status === 'delivered') return;

    setIsUpdating(true);
    try {
      await updateOrderStatus(order.id, 'delivered');
      onRefresh();
    } catch (error) {
      console.error('Failed to update order status:', error);
    } finally {
      setIsUpdating(false);
    }
  };



  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'preparing': return 'bg-[#edf3e4] text-[#6b7c54]';
      case 'ready': return 'bg-[#edf3e4] text-[#6b7c54]';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentColor = (status: PaymentStatus) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const orderSummary = order.items.map(item => `${item.quantity}x ${item.product_name}${item.presentation_name ? ` (${item.presentation_name})` : ''}`).join(', ');

  return (
    <div className={`w-full min-w-0 rounded-2xl border border-[#d7dec4] shadow-sm shadow-[#6b7c54]/10 transition-all duration-200 hover:shadow-md ${order.status === 'delivered' && order.payment_status === 'paid' ? 'bg-[#f8f4ea]/70' : 'bg-[#f5f5f0]'}`}>
      <div className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3 min-w-0">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">{order.customer_name}</h3>
              <p className="text-xs md:text-sm text-gray-600 truncate">{orderSummary}</p>
              <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('es-ES')}</p>
            </div>
            <p className="text-base md:text-lg font-bold text-amber-600 flex-shrink-0">${safeToFixed(order.total_amount)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1 md:gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${getStatusColor(order.status)}`}>
              {order.status === 'delivered' ? 'Entregada' :
               order.status === 'pending' ? 'Pendiente' :
               order.status === 'preparing' ? 'Preparando' :
               order.status === 'ready' ? 'Lista' :
               order.status === 'cancelled' ? 'Cancelada' : order.status}
            </span>

            <span className={`px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${getPaymentColor(order.payment_status)}`}>
              {order.payment_status === 'paid' ? 'Pagada' :
               order.payment_status === 'partial' ? 'Parcial' :
               order.payment_status === 'unpaid' ? 'Impaga' : order.payment_status}
            </span>

            {order.payment_method && (
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 shadow-sm border border-gray-200 flex items-center gap-1">
                <span className="text-sm">{getPaymentMethodIcon(order.payment_method)}</span>
                <span className="hidden md:inline capitalize">{order.payment_method}</span>
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {order.payment_status !== 'paid' ? (
              <button
                onClick={handleMarkPaid}
                disabled={isUpdating}
                className="btn-primary w-full text-xs px-3 py-2 flex-1 sm:w-auto sm:flex-none rounded-xl"
              >
                {isUpdating ? 'Actualizando...' : 'Marcar pagada'}
              </button>
            ) : (
              <span className="badge-success flex items-center gap-1 text-xs px-3 py-2 flex-1 sm:flex-none justify-center rounded-xl">
                ✓ Pagada
              </span>
            )}

            {order.status !== 'delivered' ? (
              <button
                onClick={handleMarkDelivered}
                disabled={isUpdating}
                className="btn-primary w-full text-xs px-3 py-2 flex-1 sm:w-auto sm:flex-none rounded-xl"
              >
                {isUpdating ? 'Actualizando...' : 'Marcar entregada'}
              </button>
            ) : (
              <span className="badge-success flex items-center gap-1 text-xs px-3 py-2 flex-1 sm:flex-none justify-center rounded-xl">
                ✓ Entregada
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
