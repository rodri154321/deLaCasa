import { useEffect, useState } from 'react';
import {
  fetchDashboardMetrics,
  fetchLowStockAlerts,
  fetchTopProducts,
  DashboardMetrics,
  LowStockItem,
  TopProduct,
} from '../services/dashboardService';
import { safeToFixed } from '../utils/formatters';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const [metricsResult, lowStockResult, topProductsResult] = await Promise.allSettled([
          fetchDashboardMetrics(),
          fetchLowStockAlerts(),
          fetchTopProducts(),
        ]);

        if (metricsResult.status === 'fulfilled') {
          setMetrics(metricsResult.value);
        } else {
          console.error('Dashboard metrics fetch failed:', metricsResult.reason);
        }

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
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Panel de Control</h1>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-6">
                <div className="loading-skeleton h-4 w-32 mb-2"></div>
                <div className="loading-skeleton h-8 w-24"></div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="card p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-600 text-sm font-medium mb-1">Ventas Totales</p>
                  <p className="text-3xl font-bold text-emerald-900">${safeToFixed(metrics?.total_sales)}</p>
                </div>
                <div className="bg-emerald-200 p-3 rounded-xl">
                  <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-600 text-sm font-medium mb-1">Ganancia Bruta</p>
                  <p className="text-3xl font-bold text-amber-900">${safeToFixed(metrics?.gross_profit)}</p>
                </div>
                <div className="bg-amber-200 p-3 rounded-xl">
                  <svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium mb-1">Ganancia Neta</p>
                  <p className="text-3xl font-bold text-blue-900">${safeToFixed(metrics?.net_profit)}</p>
                </div>
                <div className="bg-blue-200 p-3 rounded-xl">
                  <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        {/* Low Stock Alerts */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Alertas de Stock</h2>
              {lowStockItems.length > 0 && (
                <span className="badge-danger">{lowStockItems.length} alertas</span>
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
                  <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200">
                    <div>
                      <p className="font-medium text-red-900">{item.name}</p>
                      <p className="text-sm text-red-600">
                        Stock: {safeToFixed(item.current_stock)} / Mín: {safeToFixed(item.minimum_stock)}
                      </p>
                    </div>
                    <div className="bg-red-200 p-2 rounded-lg">
                      <svg className="w-4 h-4 text-red-700" fill="currentColor" viewBox="0 0 20 20">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="/orders" className="btn-secondary text-center">
              Nueva Orden
            </a>
            <a href="/products" className="btn-secondary text-center">
              Agregar Producto
            </a>
            <a href="/recipes" className="btn-secondary text-center">
              Crear Receta
            </a>
            <a href="/stock" className="btn-secondary text-center">
              Gestionar Stock
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
