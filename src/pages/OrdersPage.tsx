import { useEffect } from 'react';
import CreateOrderForm from '../components/CreateOrderForm';
import { useAppStore } from '../store/useAppStore';
import { safeToFixed } from '../utils/formatters';

export default function OrdersPage() {
  const orders = useAppStore((state) => state.orders);
  const loadOrders = useAppStore((state) => state.loadOrders);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);

  useEffect(() => {
    loadOrders().catch(console.error);
  }, [loadOrders]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Gestión de Órdenes</h1>
        <p className="text-gray-600 text-sm md:text-base">Crea y administra las órdenes de tus clientes</p>
      </div>

      {/* Create Order Form */}
      <CreateOrderForm />

      {/* Recent Orders */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Órdenes Recientes</h2>
          <p className="text-gray-600 text-sm">Historial de órdenes procesadas</p>
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
                <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                  <div className="loading-skeleton h-4 w-32"></div>
                  <div className="loading-skeleton h-4 w-24"></div>
                  <div className="loading-skeleton h-6 w-16 rounded-full"></div>
                </div>
              ))}
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 p-3 rounded-xl">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{order.customer_name}</h3>
                      <p className="text-sm text-gray-600">
                        Orden #{order.id.slice(-8)} • {new Date(order.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-amber-600">${safeToFixed(order.total_amount)}</p>
                    </div>

                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === 'delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : order.status === 'confirmed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status === 'delivered' ? 'Entregada' :
                       order.status === 'pending' ? 'Pendiente' :
                       order.status === 'confirmed' ? 'Confirmada' :
                       order.status === 'preparing' ? 'Preparando' :
                       order.status === 'ready' ? 'Lista' :
                       order.status === 'cancelled' ? 'Cancelada' : order.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-gray-100 p-4 rounded-full w-20 h-20 mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay órdenes aún</h3>
              <p className="text-gray-600 mb-6">Las órdenes que crees aparecerán aquí</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
