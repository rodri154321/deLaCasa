import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  fetchTopProducts,
  fetchMostProfitableProducts,
  backfillOrderItems,
  TopProduct,
  MostProfitableProduct,
} from '../services/dashboardService';
import { safeToFixed } from '../utils/formatters';

export default function FinancePage() {
  const { financeMetrics, loadFinanceMetrics, isLoading: storeLoading, error: storeError } = useAppStore();
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [mostProfitableProducts, setMostProfitableProducts] = useState<MostProfitableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFinance = async () => {
      try {
        setLoading(true);
        setError(null);

        // Backfill old order items if needed
        await backfillOrderItems();

        // Load finance metrics from store
        await loadFinanceMetrics();

        const [topProductsResult, mostProfitableResult] = await Promise.allSettled([
          fetchTopProducts(),
          fetchMostProfitableProducts(),
        ]);

        if (topProductsResult.status === 'fulfilled') {
          setTopProducts(topProductsResult.value);
        } else {
          console.error('Top products fetch failed:', topProductsResult.reason);
        }

        if (mostProfitableResult.status === 'fulfilled') {
          setMostProfitableProducts(mostProfitableResult.value);
        } else {
          console.error('Most profitable products fetch failed:', mostProfitableResult.reason);
        }
      } catch (err) {
        console.error('Finance load failed:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadFinance();
  }, [loadFinanceMetrics]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Finanzas</h1>
        <p className="text-gray-600 text-base md:text-lg">Análisis financiero y métricas de ventas</p>
      </div>

      {(error || storeError) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error || storeError}
          </div>
        </div>
      )}

      {/* Finance Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {(loading || storeLoading) ? (
          <>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="card p-4 md:p-6">
                <div className="loading-skeleton h-4 w-20 mb-2"></div>
                <div className="loading-skeleton h-6 md:h-8 w-16 md:w-20"></div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="card p-3 md:p-4 lg:p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-emerald-600 text-xs md:text-sm font-semibold mb-1 uppercase tracking-wide">Ingresos Hoy</p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold text-emerald-900 group-hover:scale-105 transition-transform duration-300">${safeToFixed(financeMetrics?.revenue_today)}</p>
                </div>
                <div className="bg-emerald-200 p-2 md:p-3 rounded-xl group-hover:bg-emerald-300 transition-colors duration-300 ml-3 md:ml-4">
                  <svg className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card p-3 md:p-4 lg:p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-blue-600 text-xs md:text-sm font-semibold mb-1 uppercase tracking-wide">Ingresos Mes</p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold text-blue-900 group-hover:scale-105 transition-transform duration-300">${safeToFixed(financeMetrics?.revenue_month)}</p>
                </div>
                <div className="bg-blue-200 p-2 md:p-3 rounded-xl group-hover:bg-blue-300 transition-colors duration-300 ml-3 md:ml-4">
                  <svg className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card p-3 md:p-4 lg:p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-amber-600 text-xs md:text-sm font-semibold mb-1 uppercase tracking-wide">Ganancia Hoy</p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold text-amber-900 group-hover:scale-105 transition-transform duration-300">${safeToFixed(financeMetrics?.profit_today)}</p>
                </div>
                <div className="bg-amber-200 p-2 md:p-3 rounded-xl group-hover:bg-amber-300 transition-colors duration-300 ml-3 md:ml-4">
                  <svg className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card p-3 md:p-4 lg:p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-green-600 text-xs md:text-sm font-semibold mb-1 uppercase tracking-wide">Ganancia Mes</p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold text-green-900 group-hover:scale-105 transition-transform duration-300">${safeToFixed(financeMetrics?.profit_month)}</p>
                </div>
                <div className="bg-green-200 p-2 md:p-3 rounded-xl group-hover:bg-green-300 transition-colors duration-300 ml-3 md:ml-4">
                  <svg className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card p-3 md:p-4 lg:p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-red-600 text-xs md:text-sm font-semibold mb-1 uppercase tracking-wide">Órdenes Impagas</p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold text-red-900 group-hover:scale-105 transition-transform duration-300">{financeMetrics?.unpaid_orders || 0}</p>
                </div>
                <div className="bg-red-200 p-2 md:p-3 rounded-xl group-hover:bg-red-300 transition-colors duration-300 ml-3 md:ml-4">
                  <svg className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card p-3 md:p-4 lg:p-6 bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-teal-600 text-xs md:text-sm font-semibold mb-1 uppercase tracking-wide">Órdenes Pagadas</p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold text-teal-900 group-hover:scale-105 transition-transform duration-300">{financeMetrics?.paid_orders || 0}</p>
                </div>
                <div className="bg-teal-200 p-2 md:p-3 rounded-xl group-hover:bg-teal-300 transition-colors duration-300 ml-3 md:ml-4">
                  <svg className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card p-3 md:p-4 lg:p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-purple-600 text-xs md:text-sm font-semibold mb-1 uppercase tracking-wide">Ticket Promedio</p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold text-purple-900 group-hover:scale-105 transition-transform duration-300">${safeToFixed(financeMetrics?.average_ticket)}</p>
                </div>
                <div className="bg-purple-200 p-2 md:p-3 rounded-xl group-hover:bg-purple-300 transition-colors duration-300 ml-3 md:ml-4">
                  <svg className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        {/* Best Selling Products */}
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

        {/* Most Profitable Products */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">Productos Más Rentables</h2>
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
            ) : mostProfitableProducts.length > 0 ? (
              <div className="space-y-3">
                {mostProfitableProducts.map((product, index) => (
                  <div key={`${product.product_id}-${product.presentation_name}`} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-200 text-green-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.product_name}</p>
                        {product.presentation_name && (
                          <p className="text-xs text-gray-500">{product.presentation_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-900">${safeToFixed(product.total_profit)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-gray-100 p-3 rounded-full w-16 h-16 mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <p className="text-gray-600 font-medium">Sin datos de ganancias</p>
                <p className="text-gray-500 text-sm">Las estadísticas aparecerán aquí cuando haya órdenes pagadas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}