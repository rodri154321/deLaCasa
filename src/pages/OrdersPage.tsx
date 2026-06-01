import { useEffect, useState, useMemo } from 'react';
import CreateOrderForm from '../components/CreateOrderForm';
import OrderCard from '../components/OrderCard';
import { useAppStore } from '../store/useAppStore';
import { safeToFixed } from '../utils/formatters';
import type { OrderStatus, PaymentStatus } from '../services/database';

export default function OrdersPage() {
  const orders = useAppStore((state) => state.orders);
  const loadOrders = useAppStore((state) => state.loadOrders);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);

  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all');

  const refreshOrders = async () => {
    try {
      await loadOrders();
    } catch (error) {
      console.error('Failed to refresh orders:', error);
    }
  };

  useEffect(() => {
    loadOrders().catch(console.error);
  }, [loadOrders]);

  const getTodayStart = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  const getThisWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  };

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(order =>
        order.customer_name.toLowerCase().includes(search) ||
        (order.customer_email && order.customer_email.toLowerCase().includes(search)) ||
        order.id.toLowerCase().includes(search)
      );
    }

    if (quickFilter !== 'all') {
      const now = new Date();
      switch (quickFilter) {
        case 'today':
          const todayStart = getTodayStart();
          result = result.filter(order => new Date(order.created_at) >= todayStart);
          break;
        case 'week':
          const weekStart = getThisWeekStart();
          result = result.filter(order => new Date(order.created_at) >= weekStart);
          break;
        case 'delivered':
          result = result.filter(order => order.status === 'delivered');
          break;
        case 'pending':
          result = result.filter(order => order.status === 'pending');
          break;
        case 'paid':
          result = result.filter(order => order.payment_status === 'paid');
          break;
        case 'unpaid':
          result = result.filter(order => order.payment_status === 'unpaid');
          break;
      }
    }

    result = result.filter(order =>
      statusFilter === 'all' || order.status === statusFilter
    );

    result = result.filter(order =>
      paymentFilter === 'all' || order.payment_status === paymentFilter
    );

    return result;
  }, [orders, searchTerm, quickFilter, statusFilter, paymentFilter]);

return (
    <div className="w-full min-w-0 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="text-center px-1">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Gestión de Órdenes</h1>
        <p className="text-gray-600 text-sm md:text-base">Crea y administra las órdenes de tus clientes</p>
      </div>

      {/* Create Order Form */}
      <CreateOrderForm />

      {/* Recent Orders */}
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Órdenes Recientes</h2>
              <p className="text-gray-600 text-sm">Historial de órdenes procesadas</p>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-1 w-full sm:w-auto">
              <button
                onClick={() => setQuickFilter('all')}
                className={`px-2 py-1.5 text-xs rounded-lg font-medium transition-all duration-200 ${quickFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Todas
              </button>
              <button
                onClick={() => setQuickFilter('pending')}
                className={`px-2 py-1.5 text-xs rounded-lg font-medium transition-all duration-200 ${quickFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setQuickFilter('delivered')}
                className={`px-2 py-1.5 text-xs rounded-lg font-medium transition-all duration-200 ${quickFilter === 'delivered' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Entregadas
              </button>
              <button
                onClick={() => setQuickFilter('paid')}
                className={`px-2 py-1.5 text-xs rounded-lg font-medium transition-all duration-200 ${quickFilter === 'paid' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Pagadas
              </button>
              <button
                onClick={() => setQuickFilter('unpaid')}
                className={`px-2 py-1.5 text-xs rounded-lg font-medium transition-all duration-200 ${quickFilter === 'unpaid' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Impagas
              </button>
              <button
                onClick={() => setQuickFilter('today')}
                className={`px-2 py-1.5 text-xs rounded-lg font-medium transition-all duration-200 ${quickFilter === 'today' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Hoy
              </button>
              <button
                onClick={() => setQuickFilter('week')}
                className={`px-2 py-1.5 text-xs rounded-lg font-medium transition-all duration-200 ${quickFilter === 'week' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Semana
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar por cliente, email o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Column Filters */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
              className="min-w-0 flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400"
            >
              <option value="all">📊 Todos los estados</option>
              <option value="pending">⏳ Pendientes</option>
              <option value="preparing">👨‍🍳 Preparando</option>
              <option value="ready">✅ Listas</option>
              <option value="delivered">🚚 Entregadas</option>
              <option value="cancelled">❌ Canceladas</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentStatus | 'all')}
              className="min-w-0 flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-green-400"
            >
              <option value="all">💰 Todos los pagos</option>
              <option value="unpaid">❌ Impagos</option>
              <option value="partial">⚠️ Parciales</option>
              <option value="paid">✅ Pagados</option>
            </select>
          </div>
        </div>

        <div className="card-body">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 mb-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:space-x-4 p-4 bg-gray-50 rounded-xl">
                  <div className="loading-skeleton h-4 w-32"></div>
                  <div className="loading-skeleton h-4 w-24"></div>
                  <div className="loading-skeleton h-6 w-16 rounded-full"></div>
                </div>
              ))}
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onRefresh={refreshOrders}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="bg-gradient-to-br from-gray-100 to-gray-50 p-6 rounded-2xl w-24 h-24 mx-auto mb-6 shadow-lg">
                <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No hay órdenes aún</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">Las órdenes que crees aparecerán aquí para que puedas gestionarlas fácilmente.</p>
              <button
                onClick={() => window.location.href = '/'}
                className="btn-primary"
              >
                Crear Primera Orden
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
