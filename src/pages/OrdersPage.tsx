import { useEffect, useMemo, useRef, useState } from 'react';
import CreateOrderForm from '../components/CreateOrderForm';
import OrderCard from '../components/OrderCard';
import { useAppStore } from '../store/useAppStore';
import type { OrderStatus, PaymentStatus } from '../services/database';

type DateFilter = 'all' | 'today' | 'week';

type ProductionSummaryItem = {
  key: string;
  name: string;
  quantity: number;
};

export default function OrdersPage() {
  const orders = useAppStore((state) => state.orders);
  const products = useAppStore((state) => state.products);
  const loadOrders = useAppStore((state) => state.loadOrders);
  const loadProducts = useAppStore((state) => state.loadProducts);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [productFilter, setProductFilter] = useState('all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [hasLoadedInitialOrders, setHasLoadedInitialOrders] = useState(false);
  const orderCountRef = useRef(orders.length);

  const refreshOrders = async () => {
    try {
      await loadOrders();
    } catch (error) {
      console.error('Failed to refresh orders:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    loadOrders()
      .catch(console.error)
      .finally(() => {
        if (isMounted) {
          setHasLoadedInitialOrders(true);
        }
      });
    loadProducts().catch(console.error);

    return () => {
      isMounted = false;
    };
  }, [loadOrders, loadProducts]);

  useEffect(() => {
    if (!hasLoadedInitialOrders) {
      orderCountRef.current = orders.length;
      return;
    }

    if (orders.length > orderCountRef.current) {
      orderCountRef.current = orders.length;
      loadOrders().catch(console.error);
      return;
    }

    orderCountRef.current = orders.length;
  }, [hasLoadedInitialOrders, loadOrders, orders.length]);

  useEffect(() => {
    if (!isCreateModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCreateModalOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCreateModalOpen]);

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
      result = result.filter((order) =>
        order.customer_name.toLowerCase().includes(search) ||
        (order.customer_email && order.customer_email.toLowerCase().includes(search)) ||
        order.id.toLowerCase().includes(search)
      );
    }

    if (dateFilter !== 'all') {
      switch (dateFilter) {
        case 'today':
          result = result.filter((order) => new Date(order.created_at) >= getTodayStart());
          break;
        case 'week':
          result = result.filter((order) => new Date(order.created_at) >= getThisWeekStart());
          break;
      }
    }

    result = result.filter((order) =>
      statusFilter === 'all' || order.status === statusFilter
    );

    result = result.filter((order) =>
      paymentFilter === 'all' || order.payment_status === paymentFilter
    );

    result = result.filter((order) =>
      productFilter === 'all' ||
      (order.order_items || []).some((item) => item.product_id === productFilter)
    );

    return result;
  }, [orders, searchTerm, statusFilter, paymentFilter, dateFilter, productFilter]);

  const activeProducts = useMemo(
    () => products
      .filter((product) => product.active !== false)
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [products]
  );

  const activeFilterCount = [
    statusFilter !== 'all',
    paymentFilter !== 'all',
    dateFilter !== 'all',
    productFilter !== 'all',
  ].filter(Boolean).length;

  const productionSummary = useMemo<ProductionSummaryItem[]>(() => {
    const summary = new Map<string, ProductionSummaryItem>();

    orders
      .filter((order) => order.status !== 'delivered')
      .forEach((order) => {
        (order.order_items || []).forEach((item) => {
          const key = item.presentation_id || item.product_id;
          const name = item.product_presentations?.name || item.products?.name || 'Producto';
          const quantity = Number(item.quantity || 0);

          if (!key || quantity <= 0) return;

          const existing = summary.get(key);
          summary.set(key, {
            key,
            name,
            quantity: (existing?.quantity || 0) + quantity,
          });
        });
      });

    return [...summary.values()]
      .filter((item) => item.quantity > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [orders]);

  return (
    <div className="w-full min-w-0 space-y-6 md:space-y-8">
      <div className="text-center px-1">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Gestión de Órdenes</h1>
        <p className="text-gray-600 text-sm md:text-base">Crea y administra las órdenes de tus clientes</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Órdenes Recientes</h2>
              <p className="text-gray-600 text-sm">Historial de órdenes procesadas</p>
            </div>
          </div>

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
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setIsFiltersOpen((current) => !current)}
              className="w-full justify-between rounded-lg border border-[#d7dec4] bg-white px-3 py-2 text-sm font-bold text-[#344033] shadow-sm transition-all duration-200 hover:border-[#8e9a6d] hover:bg-[#fbfaf5] sm:w-auto sm:min-w-44"
              aria-expanded={isFiltersOpen}
              aria-controls="orders-filters-panel"
            >
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 text-[#6b7c54]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 12h12M10 20h4" />
                </svg>
                Filtros
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-[#edf3e4] px-2 py-0.5 text-xs text-[#6b7c54]">
                    {activeFilterCount}
                  </span>
                )}
              </span>
              <svg
                className={`h-4 w-4 text-[#6b7c54] transition-transform duration-200 ${isFiltersOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isFiltersOpen && (
              <div
                id="orders-filters-panel"
                className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-[#e3e8d6] bg-[#fbfaf5] p-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as OrderStatus | 'all')}
                  className="min-w-0 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400"
                >
                  <option value="all">Estado: Todos</option>
                  <option value="pending">Estado: Pendientes</option>
                  <option value="delivered">Estado: Entregadas</option>
                </select>

                <select
                  value={paymentFilter}
                  onChange={(event) => setPaymentFilter(event.target.value as PaymentStatus | 'all')}
                  className="min-w-0 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-green-400"
                >
                  <option value="all">Pago: Todos</option>
                  <option value="paid">Pago: Pagadas</option>
                  <option value="unpaid">Pago: Impagas</option>
                </select>

                <select
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value as DateFilter)}
                  className="min-w-0 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 hover:border-amber-400"
                >
                  <option value="all">Fecha: Todas</option>
                  <option value="today">Fecha: Hoy</option>
                  <option value="week">Fecha: Esta semana</option>
                </select>

                <select
                  value={productFilter}
                  onChange={(event) => setProductFilter(event.target.value)}
                  className="min-w-0 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#8e9a6d] focus:border-[#8e9a6d] transition-all duration-200 hover:border-[#8e9a6d]"
                >
                  <option value="all">Producto: Todos los productos</option>
                  {activeProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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

          <section className="mb-5 rounded-2xl border border-[#d7dec4] bg-[#fbfaf5] p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">📦 Productos Pendientes</h3>
                <p className="text-sm text-gray-600">Cantidades en órdenes no entregadas</p>
              </div>
            </div>

            {productionSummary.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {productionSummary.map((item) => (
                  <div
                    key={item.key}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[#e3e8d6] bg-white px-3 py-2 shadow-sm"
                  >
                    <span className="min-w-0 truncate text-sm font-semibold text-[#344033]">{item.name}</span>
                    <strong className="shrink-0 rounded-full bg-[#edf3e4] px-3 py-1 text-sm font-bold text-[#6b7c54]">
                      {item.quantity}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-[#d7dec4] bg-white px-3 py-2 text-sm text-gray-500">
                No hay productos pendientes.
              </p>
            )}
          </section>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:space-x-4 p-4 bg-gray-50 rounded-xl">
                  <div className="loading-skeleton h-4 w-32" />
                  <div className="loading-skeleton h-4 w-24" />
                  <div className="loading-skeleton h-6 w-16 rounded-full" />
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
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary"
              >
                Crear Primera Orden
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        className="orders-create-fab"
        onClick={() => setIsCreateModalOpen(true)}
        aria-label="Crear nueva orden"
        title="Crear nueva orden"
      >
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M12 5v14m7-7H5" />
        </svg>
      </button>

      {isCreateModalOpen && (
        <div
          className="orders-create-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsCreateModalOpen(false);
            }
          }}
        >
          <section
            className="orders-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-order-modal-title"
          >
            <header className="orders-create-modal-header">
              <div>
                <h2 id="create-order-modal-title">Crear Nueva Orden</h2>
                <p>Completa los datos del pedido y confirma la orden.</p>
              </div>
              <button
                type="button"
                className="orders-create-modal-close"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="orders-create-modal-body">
              <CreateOrderForm />
            </div>

            <footer className="orders-create-modal-footer">
              <button
                type="button"
                className="btn-secondary w-full sm:w-auto"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancelar
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
