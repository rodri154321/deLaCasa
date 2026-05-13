import { useEffect } from 'react';
import CreateOrderForm from '../components/CreateOrderForm';
import OrderCard from '../components/OrderCard';
import { useAppStore } from '../store/useAppStore';
import { safeToFixed } from '../utils/formatters';

export default function OrdersPage() {
  const orders = useAppStore((state) => state.orders);
  const loadOrders = useAppStore((state) => state.loadOrders);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);

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
