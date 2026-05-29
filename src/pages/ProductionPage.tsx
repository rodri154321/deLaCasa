import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { safeToFixed } from '../utils/formatters';
import type { OrderStatus } from '../services/database';
import ProductionBatchForm from '../components/ProductionBatchForm';

function getProductionDaysFromOrders(orders: any[], days: number = 7): any[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const productionDays: any[] = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    let label = '';
    if (i === 0) label = 'Hoy';
    else if (i === 1) label = 'Mañana';
    else label = date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
    
    productionDays.push({
      date: dateStr,
      label,
      orders: [],
    });
  }
  
  const paidOrConfirmedOrders = orders.filter(
    (order: any) => order.payment_status === 'paid' || order.status === 'preparing'
  );
  
  for (const order of paidOrConfirmedOrders) {
    const orderDate = order.created_at.split('T')[0];
    const dayIndex = productionDays.findIndex((day: any) => day.date === orderDate);
    
    if (dayIndex !== -1) {
      productionDays[dayIndex].orders.push(order);
    }
  }
  
  return productionDays;
}

export default function ProductionPage() {
  const orders = useAppStore((state) => state.orders);
  const products = useAppStore((state) => state.products);
  const recipes = useAppStore((state) => state.recipes);
  const stock = useAppStore((state) => state.stock);
  const loadOrders = useAppStore((state) => state.loadOrders);
  const loadProducts = useAppStore((state) => state.loadProducts);
  const loadRecipes = useAppStore((state) => state.loadRecipes);
  const loadStock = useAppStore((state) => state.loadStock);
  const updateOrderStatus = useAppStore((state) => state.updateOrderStatus);

  const [selectedDay, setSelectedDay] = useState(0);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadOrders(), loadProducts(), loadRecipes(), loadStock()]).catch(console.error);
  }, []);

  const productionDays = useMemo(
    () => getProductionDaysFromOrders(orders, 7),
    [orders]
  );

  const aggregatedItems = useMemo(() => {
    const day = productionDays[selectedDay];
    if (!day) return [];

    const itemMap = new Map<string, {
      product_id: string;
      product_name: string;
      presentation_name: string;
      quantity: number;
      unit_price: number;
    }>();
    
    for (const order of day.orders) {
      const orderItems = (order as any).order_items || [];
      for (const item of orderItems) {
        const product = products.find((p) => p.id === item.product_id);
        const presentation = product?.product_presentations?.find((p) => p.id === item.presentation_id);
        
        if (!product || !presentation) continue;
        
        const key = `${product.id}-${presentation.id}`;
        const existing = itemMap.get(key);
        
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          itemMap.set(key, {
            product_id: product.id,
            product_name: product.name,
            presentation_name: presentation.name,
            quantity: item.quantity,
            unit_price: presentation.sale_price,
          });
        }
      }
    }
    
    return Array.from(itemMap.values()).sort((a, b) => b.quantity - a.quantity);
  }, [selectedDay, productionDays, products]);

  const ingredientRequirements = useMemo(() => {
    const day = productionDays[selectedDay];
    if (!day) return [];

    const requirements = new Map<string, {
      ingredient_id: string;
      ingredient_name: string;
      unit: string;
      required_quantity: number;
    }>();

    for (const order of day.orders) {
      const orderItems = (order as any).order_items || [];
      
      for (const item of orderItems) {
        const product = products.find((p) => p.id === item.product_id);
        const recipe = recipes.find((r) => r.product_id === item.product_id);
        
        if (!recipe) continue;
        
        const fullRecipe = (recipe as any).recipe_ingredients || [];
        
        for (const ri of fullRecipe) {
          const ing = ri.ingredients;
          if (!ing) continue;
          
          const key = ing.id;
          const required = ri.quantity * item.quantity * (product?.units_per_batch || 1);
          
          const existing = requirements.get(key);
          if (existing) {
            existing.required_quantity += required;
          } else {
            requirements.set(key, {
              ingredient_id: ing.id,
              ingredient_name: ing.name,
              unit: ing.unit,
              required_quantity: required,
            });
          }
        }
      }
    }

    const result: any[] = [];
    for (const req of requirements.values()) {
      const ingredient = stock.find((i) => i.id === req.ingredient_id);
      const currentStock = ingredient?.current_stock || 0;
      
      result.push({
        ingredient_id: req.ingredient_id,
        ingredient_name: req.ingredient_name,
        unit: req.unit,
        required_quantity: req.required_quantity,
        current_stock: currentStock,
        shortage: Math.max(0, req.required_quantity - currentStock),
      });
    }
    
    return result.sort((a, b) => b.shortage - a.shortage);
  }, [selectedDay, productionDays, products, recipes, stock]);

  const totals = useMemo(() => {
    const day = productionDays[selectedDay];
    if (!day) return { totalUnits: 0, totalOrders: 0, totalRevenue: 0 };
    
    return {
      totalUnits: aggregatedItems.reduce((sum, item) => sum + item.quantity, 0),
      totalOrders: day.orders.length,
      totalRevenue: day.orders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
    };
  }, [selectedDay, productionDays, aggregatedItems]);

  const handleQuickAction = async (orderId: string, newStatus: OrderStatus) => {
    if (isUpdating) return;
    
    setIsUpdating(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (error) {
      console.error('Failed to update order status:', error);
    } finally {
      setIsUpdating(null);
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

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'delivered': return 'Entregado';
      case 'pending': return 'Pendiente';
      case 'preparing': return 'Preparando';
      case 'ready': return 'Listo';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="text-center px-1">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Producción</h1>
        <p className="text-gray-600 text-sm md:text-base">Planificación y organización de pedidos</p>
      </div>

      {/* Date Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {productionDays.map((day, index) => (
          <button
            key={day.date}
            onClick={() => setSelectedDay(index)}
            className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 flex-shrink-0 ${
              selectedDay === index
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="text-sm">{day.label}</div>
            <div className="text-xs opacity-75">{day.orders.length} pedidos</div>
          </button>
        ))}
      </div>

      {/* Production Summary */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="card p-3 md:p-4 text-center">
          <p className="text-xs md:text-sm text-gray-600 uppercase">Unidades</p>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{totals.totalUnits}</p>
        </div>
        <div className="card p-3 md:p-4 text-center">
          <p className="text-xs md:text-sm text-gray-600 uppercase">Pedidos</p>
          <p className="text-xl md:text-2xl font-bold text-blue-600">{totals.totalOrders}</p>
        </div>
        <div className="card p-3 md:p-4 text-center">
          <p className="text-xs md:text-sm text-gray-600 uppercase">Total</p>
          <p className="text-xl md:text-2xl font-bold text-amber-600">${safeToFixed(totals.totalRevenue)}</p>
        </div>
      </div>

      {/* Production List */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Lista de Producción - {productionDays[selectedDay]?.label}</h2>
        </div>
        <div className="card-body">
          {aggregatedItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 p-4 rounded-full w-20 h-20 mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">No hay pedidos para este día</p>
            </div>
          ) : (
            <div className="space-y-3">
              {aggregatedItems.map((item) => (
                <div key={`${item.product_id}-${item.presentation_name}`} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl border border-gray-200">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{item.quantity} {item.presentation_name}</p>
                    <p className="text-sm text-gray-600">{item.product_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-600">${safeToFixed(item.quantity * item.unit_price)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Orders by Date */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Pedidos por Preparar</h2>
        </div>
        <div className="card-body">
          {productionDays[selectedDay]?.orders.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              No hay pedidos pendientes
            </div>
          ) : (
            <div className="space-y-3">
              {productionDays[selectedDay]?.orders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{order.customer_name}</p>
                      <p className="text-sm text-gray-600">${safeToFixed(order.total_amount)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  
                  {/* Quick Actions - Large buttons for mobile */}
                  <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2 mt-3">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleQuickAction(order.id, 'preparing')}
                        disabled={!!isUpdating}
                        className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white text-base font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        Preparar
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        onClick={() => handleQuickAction(order.id, 'ready')}
                        disabled={!!isUpdating}
                        className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white text-base font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
                      >
                        Listo
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button
                        onClick={() => handleQuickAction(order.id, 'delivered')}
                        disabled={!!isUpdating}
                        className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white text-base font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        Entregar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ingredient Requirements */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Ingredientes Necesarios</h2>
        </div>
        <div className="card-body">
          {ingredientRequirements.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-emerald-100 p-3 rounded-full w-16 h-16 mx-auto mb-4">
                <svg className="w-10 h-10 text-emerald-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-emerald-800 font-medium">¡Stock suficiente!</p>
              <p className="text-gray-600 text-sm">Todos los ingredientes están disponibles</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ingredientRequirements.map((req) => (
                <div key={req.ingredient_id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-red-900 truncate">{req.ingredient_name}</p>
                    <p className="text-xs text-red-600">
                      Faltan: {safeToFixed(req.shortage)} {req.unit}
                    </p>
                    <p className="text-xs text-gray-500">
                      Stock: {safeToFixed(req.current_stock)} / Necesario: {safeToFixed(req.required_quantity)}
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
          )}
        </div>
      </div>

      {/* Production Batches */}
      <ProductionBatchForm />
    </div>
  );
}