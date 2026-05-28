import { useEffect, useState } from 'react';
import {
  fetchDashboardMetrics,
  fetchLowStockAlerts,
  fetchTopProducts,
  fetchOrderMetrics,
  fetchRecentOrders,
  DashboardMetrics,
  OrderMetrics,
  LowStockItem,
  TopProduct,
  DashboardOrder,
} from '../services/dashboardService';
import { safeToFixed } from '../utils/formatters';
import DashboardOrderCard from '../components/DashboardOrderCard';
import type { OrderStatus, PaymentStatus } from '../services/database';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [orderMetrics, setOrderMetrics] = useState<OrderMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<DashboardOrder[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const [metricsResult, orderMetricsResult, lowStockResult, topProductsResult] = await Promise.allSettled([
          fetchDashboardMetrics(),
          fetchOrderMetrics(),
          fetchLowStockAlerts(),
          fetchTopProducts(),
        ]);

        if (metricsResult.status === 'fulfilled') {
          setMetrics(metricsResult.value);
        } else {
          console.error('Dashboard metrics fetch failed:', metricsResult.reason);
        }

        if (orderMetricsResult.status === 'fulfilled') {
          setOrderMetrics(orderMetricsResult.value);
        } else {
          console.error('Dashboard order metrics fetch failed:', orderMetricsResult.reason);
          setOrderMetrics({
            pending_orders: 0,
            preparing_orders: 0,
            delivered_today: 0,
            unpaid_orders: 0,
            revenue_today: 0,
            revenue_this_month: 0,
          });
        }

        const fetchedOrders = await fetchRecentOrders(8, !showCompleted);
        setRecentOrders(fetchedOrders);

        if (lowStockResult.status === 'fulfilled') {
          console.log('Dashboard low stock items:', lowStockResult.value);
          setLowStockItems(lowStockResult.value);
        } else {
          console.error('Dashboard low stock fetch failed:', lowStockResult.reason);
          setLowStockItems([]);
          setError((lowStockResult.reason as Error).message);
        }

        if (topProductsResult.status === 'fulfilled') {
          setTopProducts(topProductsResult.value);
        } else {
          console.error('Dashboard top products fetch failed:', topProductsResult.reason);
        }
      } catch (err) {
        console.error('Dashboard load failed:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [showCompleted]);

  const refreshDashboard = async () => {
    try {
      const [orderMetricsResult] = await Promise.allSettled([
        fetchOrderMetrics(),
      ]);

      if (orderMetricsResult.status === 'fulfilled') {
        setOrderMetrics(orderMetricsResult.value);
      }

      const fetchedOrders = await fetchRecentOrders(8, !showCompleted);
      setRecentOrders(fetchedOrders);
    } catch (error) {
      console.error('Dashboard refresh failed:', error);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="text-center px-1">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 leading-tight">Panel de Control</h1>
        <p className="text-gray-600 text-base md:text-lg">Bienvenido a tu sistema de gestión de la Alfajoreria</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card p-4 md:p-6">
                <div className="loading-skeleton h-4 w-20 mb-2"></div>
                <div className="loading-skeleton h-6 md:h-8 w-16 md:w-20"></div>
              </div>
            ))}
          </>
        ) : (
          <>


            {/* Order Metrics */}
            <div className="card p-3 md:p-4 lg:p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-green-600 text-xs md:text-sm font-semibold mb-1 uppercase tracking-wide">Órdenes Pendientes</p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold text-green-900 group-hover:scale-105 transition-transform duration-300">{orderMetrics?.pending_orders || 0}</p>
                </div>
                <div className="bg-green-200 p-2 md:p-3 rounded-xl group-hover:bg-green-300 transition-colors duration-300 ml-3 md:ml-4">
                  <svg className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card p-3 md:p-4 lg:p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-emerald-600 text-xs md:text-sm font-semibold mb-1 uppercase tracking-wide">En Preparación</p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold text-emerald-900 group-hover:scale-105 transition-transform duration-300">{orderMetrics?.preparing_orders || 0}</p>
                </div>
                <div className="bg-emerald-200 p-2 md:p-3 rounded-xl group-hover:bg-emerald-300 transition-colors duration-300 ml-3 md:ml-4">
                  <svg className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card p-3 md:p-4 lg:p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-amber-600 text-xs md:text-sm font-semibold mb-1 uppercase tracking-wide">Listas para Entregar</p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold text-amber-900 group-hover:scale-105 transition-transform duration-300">{orderMetrics?.ready_orders || 0}</p>
                </div>
                <div className="bg-amber-200 p-2 md:p-3 rounded-xl group-hover:bg-amber-300 transition-colors duration-300 ml-3 md:ml-4">
                  <svg className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card p-3 md:p-4 lg:p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-orange-600 text-xs md:text-sm font-semibold mb-1 uppercase tracking-wide">Entregadas Hoy</p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold text-orange-900 group-hover:scale-105 transition-transform duration-300">{orderMetrics?.delivered_today || 0}</p>
                </div>
                <div className="bg-orange-200 p-2 md:p-3 rounded-xl group-hover:bg-orange-300 transition-colors duration-300 ml-3 md:ml-4">
                  <svg className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent Orders */}
      <div className="card hover:shadow-xl transition-shadow duration-300">
        <div className="card-header bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Órdenes Recientes</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  showCompleted
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                Mostrar completados
              </button>

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
        </div>

        <div className="card-body">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="loading-skeleton h-4 w-24"></div>
                    <div className="loading-skeleton h-3 w-32"></div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="loading-skeleton h-6 w-16 rounded-full"></div>
                    <div className="loading-skeleton h-6 w-12 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders
                .filter(order => !showCompleted && order.status === 'delivered' && order.payment_status === 'paid' ? false : true)
                .filter(order =>
                  statusFilter === 'all' || order.status === statusFilter
                )
                .filter(order =>
                  paymentFilter === 'all' || order.payment_status === paymentFilter
                )
                .slice(0, 6)
                .map((order) => (
                  <DashboardOrderCard
                    key={order.id}
                    order={order}
                    onRefresh={refreshDashboard}
                  />
                ))}
            </div>
          )}

          {!loading && recentOrders.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600">No hay órdenes recientes</p>
            </div>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        {/* Low Stock Alerts */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Alertas de Stock</h2>
              {lowStockItems.length > 0 && (
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">{lowStockItems.length} alertas</span>
              )}
            </div>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="loading-skeleton h-4 w-32"></div>
                    <div className="loading-skeleton h-4 w-16"></div>
                  </div>
                ))}
              </div>
            ) : lowStockItems.length > 0 ? (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-200">
                    <div>
                      <p className="font-medium text-orange-900">{item.name}</p>
                      <p className="text-sm text-orange-600">
                        Stock: {safeToFixed(item.current_stock)} / Mín: {safeToFixed(item.minimum_stock)}
                      </p>
                    </div>
                    <div className="bg-orange-200 p-2 rounded-lg">
                      <svg className="w-4 h-4 text-orange-700" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-emerald-100 p-3 rounded-full w-16 h-16 mx-auto mb-4">
                  <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-emerald-800 font-medium">¡Todo en orden!</p>
                <p className="text-emerald-600 text-sm">Todos los ingredientes están por encima del stock mínimo</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">Productos Más Vendidos</h2>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="loading-skeleton h-4 w-40"></div>
                    <div className="loading-skeleton h-4 w-12"></div>
                  </div>
                ))}
              </div>
            ) : topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={product.product_id} className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                    <div className="flex items-center space-x-3">
                      <div className="bg-amber-200 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.product_name}</p>
                        {product.presentation_name && (
                          <p className="text-xs text-gray-500">{product.presentation_name}</p>
                        )}
                        <p className="text-sm text-gray-600">{product.total_quantity} unidades</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-900">${safeToFixed(product.sales_amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-gray-100 p-3 rounded-full w-16 h-16 mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-gray-600 font-medium">Sin datos de ventas</p>
                <p className="text-gray-500 text-sm">Las estadísticas aparecerán aquí cuando haya órdenes completadas</p>
              </div>
            )}
          </div>
        </div>
      </div>

      

      {/* Quick Actions */}
      <div className="card bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <div className="card-body">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            <a href="/orders" className="btn-secondary text-center w-full">
              Nueva Orden
            </a>
            <a href="/products" className="btn-secondary text-center w-full">
              Agregar Producto
            </a>
            <a href="/recipes" className="btn-secondary text-center w-full">
              Crear Receta
            </a>
            <a href="/stock" className="btn-secondary text-center w-full">
              Gestionar Stock
            </a>
            <a href="/finance" className="btn-secondary text-center w-full">
              Ver Finanzas
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
