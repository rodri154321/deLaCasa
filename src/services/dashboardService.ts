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

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    // Get all paid orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'paid');

    if (ordersError) {
      console.error('Error fetching orders for dashboard metrics:', ordersError);
      return {
        total_sales: 0,
        gross_profit: 0,
        total_cost: 0,
        net_profit: 0,
      };
    }

    // Get all order items profits
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('profit, unit_cost, quantity')
      .in('order_id',
        supabase.from('orders').select('id').eq('payment_status', 'paid')
      );

    if (itemsError) {
      console.error('Error fetching order items for dashboard metrics:', itemsError);
      return {
        total_sales: 0,
        gross_profit: 0,
        total_cost: 0,
        net_profit: 0,
      };
    }

    const total_sales = orders?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;
    const gross_profit = items?.reduce((sum, item) => sum + Number(item.profit || 0), 0) || 0;
    const total_cost = items?.reduce((sum, item) => sum + (Number(item.unit_cost || 0) * Number(item.quantity || 0)), 0) || 0;
    const net_profit = gross_profit; // Assuming no other costs

    return {
      total_sales,
      gross_profit,
      total_cost,
      net_profit,
    };
  } catch (error) {
    console.error('Error calculating dashboard metrics:', error);
    return {
      total_sales: 0,
      gross_profit: 0,
      total_cost: 0,
      net_profit: 0,
    };
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

  console.log('Fetched dashboard ingredients:', data);

  return (data || [])
    .map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      current_stock: Number(ingredient.current_stock || 0),
      minimum_stock: Number(ingredient.minimum_stock || 0),
    }))
    .filter((ingredient) => ingredient.current_stock <= ingredient.minimum_stock) as LowStockItem[];
}

export async function fetchTopProducts() {
  // Aggregate from order_items directly to ensure accuracy
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
    .in('order_id',
      supabase.from('orders').select('id').eq('payment_status', 'paid')
    );

  if (error) {
    console.error('Error fetching top products:', error);
    return [];
  }

  // Aggregate sales
  const salesMap = new Map<string, TopProduct>();

  data?.forEach((item: any) => {
    const key = `${item.product_id}-${item.presentation_id || ''}`;
    const existing = salesMap.get(key);
    const quantity = Number(item.quantity || 0);
    const subtotal = Number(item.subtotal || 0);
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
    .sort((a, b) => b.sales_amount - a.sales_amount)
    .slice(0, 10);
}

export async function fetchOrderMetrics(): Promise<OrderMetrics> {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // Run multiple queries in parallel
    const [pendingResult, preparingResult, readyResult, deliveredTodayResult, unpaidResult, revenueTodayResult, revenueMonthResult] = await Promise.allSettled([
      // Pending orders
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),

      // Preparing orders
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'preparing'),

      // Ready orders
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'ready'),

      // Delivered today
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'delivered').gte('delivered_at', today),

      // Unpaid orders
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'unpaid'),

      // Revenue today (only paid orders)
      supabase.from('orders').select('total_amount').eq('payment_status', 'paid').gte('paid_at', today),

      // Revenue this month (only paid orders)
      supabase.from('orders').select('total_amount').eq('payment_status', 'paid').gte('paid_at', startOfMonth),
    ]);

    const metrics: OrderMetrics = {
      pending_orders: pendingResult.status === 'fulfilled' ? (pendingResult.value.count || 0) : 0,
      preparing_orders: preparingResult.status === 'fulfilled' ? (preparingResult.value.count || 0) : 0,
      ready_orders: readyResult.status === 'fulfilled' ? (readyResult.value.count || 0) : 0,
      delivered_today: deliveredTodayResult.status === 'fulfilled' ? (deliveredTodayResult.value.count || 0) : 0,
      unpaid_orders: unpaidResult.status === 'fulfilled' ? (unpaidResult.value.count || 0) : 0,
      revenue_today: revenueTodayResult.status === 'fulfilled'
        ? (revenueTodayResult.value.data?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0)
        : 0,
      revenue_this_month: revenueMonthResult.status === 'fulfilled'
        ? (revenueMonthResult.value.data?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0)
        : 0,
    };

    return metrics;
  } catch (error) {
    console.error('Error fetching order metrics:', error);
    // Return default metrics on error
    return {
      pending_orders: 0,
      preparing_orders: 0,
      ready_orders: 0,
      delivered_today: 0,
      unpaid_orders: 0,
      revenue_today: 0,
      revenue_this_month: 0,
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
    // Exclude orders where status = 'delivered' AND payment_status = 'paid'
    // Using .not() with .and() for the combined condition
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
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [revenueTodayResult, revenueMonthResult, profitTodayResult, profitMonthResult, unpaidResult, paidResult, averageTicketResult] = await Promise.allSettled([
      // Revenue today
      supabase.from('orders').select('total_amount').eq('payment_status', 'paid').gte('paid_at', today),
      // Revenue month
      supabase.from('orders').select('total_amount').eq('payment_status', 'paid').gte('paid_at', startOfMonth),
      // Profit today (sum profit from order_items where order paid today)
      supabase.from('order_items').select('profit').in('order_id',
        supabase.from('orders').select('id').eq('payment_status', 'paid').gte('paid_at', today)
      ),
      // Profit month
      supabase.from('order_items').select('profit').in('order_id',
        supabase.from('orders').select('id').eq('payment_status', 'paid').gte('paid_at', startOfMonth)
      ),
      // Unpaid orders count
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'unpaid'),
      // Paid orders count
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'paid'),
      // Average ticket (average total_amount for paid orders this month)
      supabase.from('orders').select('total_amount').eq('payment_status', 'paid').gte('paid_at', startOfMonth),
    ]);

    const revenue_today = revenueTodayResult.status === 'fulfilled'
      ? (revenueTodayResult.value.data?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0)
      : 0;

    const revenue_month = revenueMonthResult.status === 'fulfilled'
      ? (revenueMonthResult.value.data?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0)
      : 0;

    const profit_today = profitTodayResult.status === 'fulfilled'
      ? (profitTodayResult.value.data?.reduce((sum, item) => sum + Number(item.profit || 0), 0) || 0)
      : 0;

    const profit_month = profitMonthResult.status === 'fulfilled'
      ? (profitMonthResult.value.data?.reduce((sum, item) => sum + Number(item.profit || 0), 0) || 0)
      : 0;

    const unpaid_orders = unpaidResult.status === 'fulfilled' ? (unpaidResult.value.count || 0) : 0;
    const paid_orders = paidResult.status === 'fulfilled' ? (paidResult.value.count || 0) : 0;

    const average_ticket = averageTicketResult.status === 'fulfilled' && averageTicketResult.value.data && averageTicketResult.value.data.length > 0
      ? (averageTicketResult.value.data.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) / averageTicketResult.value.data.length)
      : 0;

    return {
      revenue_today,
      revenue_month,
      profit_today,
      profit_month,
      unpaid_orders,
      paid_orders,
      average_ticket,
    };
  } catch (error) {
    console.error('Error fetching finance metrics:', error);
    return {
      revenue_today: 0,
      revenue_month: 0,
      profit_today: 0,
      profit_month: 0,
      unpaid_orders: 0,
      paid_orders: 0,
      average_ticket: 0,
    };
  }
}

export async function backfillOrderItems() {
  // Get order_items that are missing unit_price, unit_cost, subtotal, or profit
  const { data: itemsToBackfill, error: fetchError } = await supabase
    .from('order_items')
    .select(`
      id,
      order_id,
      product_id,
      presentation_id,
      quantity,
      unit_price,
      unit_cost,
      subtotal,
      profit,
      products (sale_price, estimated_cost),
      product_presentations (sale_price)
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
    const quantity = Number(item.quantity);
    const unitPrice = item.unit_price ?? item.product_presentations?.sale_price ?? item.products?.sale_price ?? 0;
    const unitCost = item.unit_cost ?? (item.products?.estimated_cost ?? 0) / (item.product_presentations?.quantity ?? 1);
    const subtotal = item.subtotal ?? (unitPrice * quantity);
    const profit = item.profit ?? (subtotal - (unitCost * quantity));

    await supabase
      .from('order_items')
      .update({
        unit_price: unitPrice,
        unit_cost: unitCost,
        subtotal: subtotal,
        profit: profit,
      })
      .eq('id', item.id);
  }

  console.log('Backfill completed');
}

export async function fetchMostProfitableProducts(): Promise<MostProfitableProduct[]> {
  // Group by product and presentation, sum profit
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      product_id,
      products (name),
      presentation_id,
      product_presentations (name),
      profit
    `)
    .in('order_id',
      supabase.from('orders').select('id').eq('payment_status', 'paid')
    );

  if (error) {
    console.error('Error fetching most profitable products:', error);
    return [];
  }

  // Aggregate profits
  const profitMap = new Map<string, MostProfitableProduct>();

  data?.forEach((item: any) => {
    const key = `${item.product_id}-${item.presentation_id || ''}`;
    const existing = profitMap.get(key);
    const profit = Number(item.profit || 0);
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
