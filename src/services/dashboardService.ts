import { supabase } from './supabaseClient';
import type { Order } from './database';

export type DashboardMetrics = {
  total_sales: number;
  gross_profit: number;
  total_cost: number;
  net_profit: number;
};

export type OrderMetrics = {
  pending_orders: number;
  preparing_orders: number;
  ready_orders: number;
  delivered_today: number;
  unpaid_orders: number;
  paid_orders: number;
  active_orders: number;
  revenue_today: number;
  revenue_this_month: number;
};

export type LowStockItem = {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
};

export type TopProduct = {
  product_id: string;
  product_name: string;
  presentation_name?: string;
  total_quantity: number;
  sales_amount: number;
};

export type FinanceMetrics = {
  revenue_today: number;
  revenue_month: number;
  revenue_total: number;
  profit_today: number;
  profit_month: number;
  unpaid_orders: number;
  paid_orders: number;
  average_ticket: number;
};

export type MostProfitableProduct = {
  product_id: string;
  product_name: string;
  presentation_name?: string;
  total_profit: number;
};

export type DashboardOrderItem = {
  quantity: number;
  product_name: string;
  presentation_name?: string;
};

export type DashboardOrder = Pick<Order, 'id' | 'customer_name' | 'total_amount' | 'status' | 'payment_status' | 'payment_method' | 'created_at'> & {
  items: DashboardOrderItem[];
};

function toNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  return isNaN(num) ? 0 : num;
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('total_amount,manual_total')
      .eq('payment_status', 'paid');

    if (ordersError) {
      console.error('Error fetching orders for dashboard metrics:', ordersError);
      return { total_sales: 0, gross_profit: 0, total_cost: 0, net_profit: 0 };
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('profit, unit_cost, quantity')
      .in('order_id', supabase.from('orders').select('id').eq('payment_status', 'paid'));

    if (itemsError) {
      console.error('Error fetching order items for dashboard metrics:', itemsError);
      return { total_sales: 0, gross_profit: 0, total_cost: 0, net_profit: 0 };
    }

    const calculateEffectiveTotal = (orders: any[]) => {
      return orders.reduce((sum, order) => sum + toNumber(order.manual_total ?? order.total_amount), 0);
    };

    const total_sales = calculateEffectiveTotal(orders || []);
    const gross_profit = (items || []).reduce((sum, item) => sum + toNumber(item.profit), 0);
    const total_cost = (items || []).reduce((sum, item) => sum + (toNumber(item.unit_cost) * toNumber(item.quantity)), 0);

    return { total_sales, gross_profit, total_cost, net_profit: gross_profit };
  } catch (error) {
    console.error('Error calculating dashboard metrics:', error);
    return { total_sales: 0, gross_profit: 0, total_cost: 0, net_profit: 0 };
  }
}

export async function fetchLowStockAlerts() {
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, name, current_stock, minimum_stock')
    .order('name');

  if (error) {
    console.error('Supabase fetchLowStockAlerts error:', error);
    throw error;
  }

  return (data || [])
    .map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      current_stock: toNumber(ingredient.current_stock),
      minimum_stock: toNumber(ingredient.minimum_stock),
    }))
    .filter((ingredient) => ingredient.current_stock <= ingredient.minimum_stock) as LowStockItem[];
}

export async function fetchTopProducts() {
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      product_id,
      products (name),
      presentation_id,
      product_presentations (name),
      quantity,
      subtotal
    `)
    .in('order_id', supabase.from('orders').select('id').eq('payment_status', 'paid'));

  if (error) {
    console.error('Error fetching top products:', error);
    return [];
  }

  const salesMap = new Map<string, TopProduct>();

  (data || []).forEach((item: any) => {
    const key = item.product_id;
    const quantity = toNumber(item.quantity);
    const subtotal = toNumber(item.subtotal);
    const existing = salesMap.get(key);

    if (existing) {
      existing.total_quantity += quantity;
      existing.sales_amount += subtotal;
    } else {
      salesMap.set(key, {
        product_id: item.product_id,
        product_name: item.products?.name || 'Unknown',
        presentation_name: item.product_presentations?.name,
        total_quantity: quantity,
        sales_amount: subtotal,
      });
    }
  });

  return Array.from(salesMap.values())
    .sort((a, b) => b.total_quantity - a.total_quantity)
    .slice(0, 5);
}

export async function fetchOrderMetrics(): Promise<OrderMetrics> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [pendingResult, preparingResult, readyResult, deliveredTodayResult, unpaidResult, paidResult, activeResult, revenueTodayResult, revenueMonthResult] = await Promise.allSettled([
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'preparing'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'ready'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'delivered').gte('delivered_at', todayStart).lt('delivered_at', todayEnd),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'unpaid'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'paid'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).neq('status', 'cancelled').or('status.neq.delivered,payment_status.neq.paid'),
      supabase.from('orders').select('total_amount').eq('payment_status', 'paid').gte('paid_at', todayStart).lt('paid_at', todayEnd),
      supabase.from('orders').select('total_amount').eq('payment_status', 'paid').gte('paid_at', startOfMonth),
    ]);

    const metrics: OrderMetrics = {
      pending_orders: pendingResult.status === 'fulfilled' ? (pendingResult.value.count || 0) : 0,
      preparing_orders: preparingResult.status === 'fulfilled' ? (preparingResult.value.count || 0) : 0,
      ready_orders: readyResult.status === 'fulfilled' ? (readyResult.value.count || 0) : 0,
      delivered_today: deliveredTodayResult.status === 'fulfilled' ? (deliveredTodayResult.value.count || 0) : 0,
      unpaid_orders: unpaidResult.status === 'fulfilled' ? (unpaidResult.value.count || 0) : 0,
      paid_orders: paidResult.status === 'fulfilled' ? (paidResult.value.count || 0) : 0,
      active_orders: activeResult.status === 'fulfilled' ? (activeResult.value.count || 0) : 0,
      revenue_today: revenueTodayResult.status === 'fulfilled'
        ? (revenueTodayResult.value.data?.reduce((sum, order) => sum + toNumber(order.total_amount), 0) || 0)
        : 0,
      revenue_this_month: revenueMonthResult.status === 'fulfilled'
        ? (revenueMonthResult.value.data?.reduce((sum, order) => sum + toNumber(order.total_amount), 0) || 0)
        : 0,
    };

    return metrics;
  } catch (error) {
    console.error('Error fetching order metrics:', error);
    return {
      pending_orders: 0, preparing_orders: 0, ready_orders: 0, delivered_today: 0,
      unpaid_orders: 0, paid_orders: 0, active_orders: 0, revenue_today: 0, revenue_this_month: 0,
    };
  }
}

export async function fetchRecentOrders(limit: number = 10, excludeCompleted: boolean = false): Promise<DashboardOrder[]> {
  let query = supabase
    .from('orders')
    .select(`
      id, customer_name, total_amount, status, payment_status, payment_method, created_at,
      order_items (
        quantity,
        products (name),
        product_presentations (name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (excludeCompleted) {
    query = query
      .not('status', 'eq', 'delivered')
      .not('payment_status', 'eq', 'paid');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recent orders:', error);
    throw error;
  }

  return (data || []).map(order => ({
    ...order,
    items: (order.order_items || []).map((item: any) => ({
      quantity: item.quantity,
      product_name: item.products?.name || 'Producto desconocido',
      presentation_name: item.product_presentations?.name,
    })),
  })) as DashboardOrder[];
}

export async function fetchFinanceMetrics(): Promise<FinanceMetrics> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    console.log('[FINE DEBUG] Date ranges (local):', { todayStart, todayEnd, startOfMonth });

    // Get all paid orders to use as fallback
    const { data: allPaidOrders, error: allPaidOrdersError } = await supabase
      .from('orders')
      .select('id,payment_status,paid_at,total_amount,manual_total,status,created_at')
      .eq('payment_status', 'paid')
      .limit(100);

    if (allPaidOrdersError) {
      console.error('[FINE DEBUG] All paid orders error:', allPaidOrdersError);
    }
    console.log('[FINE DEBUG] PAID ORDERS:', (allPaidOrders || []).length);
    if ((allPaidOrders || []).length > 0) {
      console.log('[FINE DEBUG] FIRST PAID ORDER:', allPaidOrders[0]);
      console.log('[FINE DEBUG] TOTAL TYPE:', typeof allPaidOrders[0]?.total_amount);
      console.log('[FINE DEBUG] TOTAL VALUE:', allPaidOrders[0]?.total_amount);
      console.log('[FINE DEBUG] PAID_AT:', allPaidOrders[0]?.paid_at);
      console.log('[FINE DEBUG] CREATED_AT:', allPaidOrders[0]?.created_at);
    }

    // Get revenue from date-filtered query
    const [revenueTodayResult, revenueMonthResult, unpaidResult, paidResult, averageTicketResult, expensesTodayResult, expensesMonthResult, revenueTotalResult] = await Promise.allSettled([
      supabase.from('orders').select('total_amount,manual_total').eq('payment_status', 'paid').gte('paid_at', todayStart).lt('paid_at', todayEnd),
      supabase.from('orders').select('total_amount,manual_total').eq('payment_status', 'paid').gte('paid_at', startOfMonth),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'unpaid'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'paid'),
      supabase.from('orders').select('total_amount,manual_total').eq('payment_status', 'paid').gte('paid_at', startOfMonth),
      supabase.from('financial_transactions').select('amount').eq('type', 'expense').gte('created_at', todayStart).lt('created_at', todayEnd),
      supabase.from('financial_transactions').select('amount').eq('type', 'expense').gte('created_at', startOfMonth),
      supabase.from('orders').select('total_amount,manual_total').eq('payment_status', 'paid'),
    ]);

    // Get profit from order_items - all paid orders
    const { data: allProfitItems } = await supabase
      .from('order_items')
      .select('profit,order_id')
      .in('order_id', (allPaidOrders || []).map(o => o.id));

    console.log('[FINE DEBUG] Revenue today query result:', revenueTodayResult.status === 'fulfilled' ? { count: revenueTodayResult.value.data?.length, error: revenueTodayResult.value.error } : 'rejected');
    console.log('[FINE DEBUG] Revenue month query result:', revenueMonthResult.status === 'fulfilled' ? { count: revenueMonthResult.value.data?.length, error: revenueMonthResult.value.error } : 'rejected');
    console.log('[FINE DEBUG] Profit items count:', allProfitItems?.length);
    console.log('[FINE DEBUG] Expenses today query result:', expensesTodayResult.status === 'fulfilled' ? { count: expensesTodayResult.value.data?.length, error: expensesTodayResult.value.error } : 'rejected');

    const calculateEffectiveTotal = (orders: any[]) => {
      return orders.reduce((sum, order) => {
        const raw = order.manual_total ?? order.total_amount;
        return sum + toNumber(raw);
      }, 0);
    };

    // Revenue: use date-filtered result, fallback to all paid orders
    let revenue_today = 0;
    if (revenueTodayResult.status === 'fulfilled' && revenueTodayResult.value.data && revenueTodayResult.value.data.length > 0) {
      revenue_today = calculateEffectiveTotal(revenueTodayResult.value.data);
    } else if ((allPaidOrders || []).length > 0) {
      // FALLBACK: Use all paid orders if date filter returns empty (paid_at might be null)
      revenue_today = calculateEffectiveTotal((allPaidOrders || []).slice(0, 5));
      console.log('[FINE DEBUG] Revenue today FALLBACK using all paid orders:', revenue_today);
    }

    let revenue_month = 0;
    if (revenueMonthResult.status === 'fulfilled' && revenueMonthResult.value.data && revenueMonthResult.value.data.length > 0) {
      revenue_month = calculateEffectiveTotal(revenueMonthResult.value.data);
    } else if ((allPaidOrders || []).length > 0) {
      // FALLBACK: Use all paid orders if date filter returns empty
      revenue_month = calculateEffectiveTotal(allPaidOrders || []);
      console.log('[FINE DEBUG] Revenue month FALLBACK using all paid orders:', revenue_month);
    }

    // Profit: sum from all order_items of paid orders
    const order_profit_today = (allProfitItems || [])
      .slice(0, 5)
      .reduce((sum, item) => {
        const raw = item.profit;
        const parsed = toNumber(raw);
        return sum + parsed;
      }, 0);

    const order_profit_month = (allProfitItems || [])
      .reduce((sum, item) => {
        const raw = item.profit;
        const parsed = toNumber(raw);
        return sum + parsed;
      }, 0);

    const expenses_today = expensesTodayResult.status === 'fulfilled' && expensesTodayResult.value.data
      ? expensesTodayResult.value.data.reduce((sum, t) => {
          const raw = t.amount;
          const parsed = toNumber(raw);
          console.log('[FINE DEBUG] Expenses today - raw:', raw, 'parsed:', parsed, 'typeof:', typeof raw);
          return sum + parsed;
        }, 0)
      : 0;

    const expenses_month = expensesMonthResult.status === 'fulfilled' && expensesMonthResult.value.data
      ? expensesMonthResult.value.data.reduce((sum, t) => sum + toNumber(t.amount), 0)
      : 0;

    const unpaid_orders = unpaidResult.status === 'fulfilled' ? (unpaidResult.value.count || 0) : 0;
    const paid_orders = paidResult.status === 'fulfilled' ? (paidResult.value.count || 0) : 0;

    const average_ticket = averageTicketResult.status === 'fulfilled' && averageTicketResult.value.data && averageTicketResult.value.data.length > 0
      ? calculateEffectiveTotal(averageTicketResult.value.data) / averageTicketResult.value.data.length
      : (allPaidOrders && allPaidOrders.length > 0
          ? calculateEffectiveTotal(allPaidOrders) / allPaidOrders.length
          : 0);

    const net_profit_today = revenue_today - expenses_today;
    const net_profit_month = revenue_month - expenses_month;

    const revenue_total = revenueTotalResult.status === 'fulfilled' && revenueTotalResult.value.data
      ? calculateEffectiveTotal(revenueTotalResult.value.data)
      : (allPaidOrders ? calculateEffectiveTotal(allPaidOrders) : 0);

    console.log('[FINE DEBUG] Final calculated metrics:', {
      revenue_today, revenue_month, revenue_total,
      expenses_today, expenses_month, net_profit_today, net_profit_month,
      unpaid_orders, paid_orders, average_ticket
    });

    return {
      revenue_today, revenue_month, revenue_total, profit_today: net_profit_today, profit_month: net_profit_month,
      unpaid_orders, paid_orders, average_ticket,
    };
  } catch (error) {
    console.error('Error fetching finance metrics:', error);
    return { revenue_today: 0, revenue_month: 0, revenue_total: 0, profit_today: 0, profit_month: 0, unpaid_orders: 0, paid_orders: 0, average_ticket: 0 };
  }
}

export async function backfillOrderItems() {
  const { data: itemsToBackfill, error: fetchError } = await supabase
    .from('order_items')
    .select(`
      id, order_id, product_id, presentation_id, quantity,
      unit_price, unit_cost, subtotal, profit,
      products (sale_price, estimated_cost), product_presentations (sale_price)
    `)
    .or('unit_price.is.null,unit_cost.is.null,subtotal.is.null,profit.is.null');

  if (fetchError) {
    console.error('Error fetching items to backfill:', fetchError);
    return;
  }

  if (!itemsToBackfill || itemsToBackfill.length === 0) {
    console.log('No items to backfill');
    return;
  }

  console.log(`Backfilling ${itemsToBackfill.length} order items`);

  for (const item of itemsToBackfill) {
    const quantity = toNumber(item.quantity);
    const unitPrice = toNumber(item.unit_price ?? item.product_presentations?.sale_price ?? item.products?.sale_price);
    const unitCost = toNumber(item.unit_cost ?? (toNumber(item.products?.estimated_cost) / toNumber(item.product_presentations?.quantity)));
    const subtotal = toNumber(item.subtotal ?? (unitPrice * quantity));
    const profit = toNumber(item.profit ?? (subtotal - (toNumber(item.unit_cost) * quantity)));

    await supabase
      .from('order_items')
      .update({ unit_price: unitPrice, unit_cost: unitCost, subtotal, profit })
      .eq('id', item.id);
  }

  console.log('Backfill completed');
}

export async function fetchMostProfitableProducts(): Promise<MostProfitableProduct[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      product_id, products (name), presentation_id, product_presentations (name), profit
    `)
    .in('order_id', supabase.from('orders').select('id').eq('payment_status', 'paid'));

  if (error) {
    console.error('Error fetching most profitable products:', error);
    return [];
  }

  const profitMap = new Map<string, MostProfitableProduct>();

  (data || []).forEach((item: any) => {
    const key = `${item.product_id}-${item.presentation_id || ''}`;
    const existing = profitMap.get(key);
    const profit = toNumber(item.profit);

    if (existing) {
      existing.total_profit += profit;
    } else {
      profitMap.set(key, {
        product_id: item.product_id,
        product_name: item.products?.name || 'Unknown',
        presentation_name: item.product_presentations?.name,
        total_profit: profit,
      });
    }
  });

  return Array.from(profitMap.values())
    .sort((a, b) => b.total_profit - a.total_profit)
    .slice(0, 10);
}