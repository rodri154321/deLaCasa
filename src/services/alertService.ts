import { supabase } from './supabaseClient';

export type AlertSeverity = 'warning' | 'critical' | 'info';

export interface OperationalAlert {
  id: string;
  type: string;
  message: string;
  severity: AlertSeverity;
  count?: number;
  amount?: number;
  link?: string;
}

export async function fetchOperationalAlerts(): Promise<OperationalAlert[]> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const alerts: OperationalAlert[] = [];

  // 1. Unpaid orders
  try {
    const { count: unpaidCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('payment_status', 'unpaid')
      .neq('status', 'cancelled');

    if (unpaidCount && unpaidCount > 0) {
      alerts.push({
        id: 'unpaid-orders',
        type: 'unpaid',
        message: unpaidCount === 1
          ? '1 orden impaga pendiente'
          : `${unpaidCount} órdenes impagas pendientes`,
        severity: unpaidCount > 3 ? 'critical' : 'warning',
        count: unpaidCount,
        link: '/orders',
      });
    }
  } catch (e) {
    console.warn('Alert check: unpaid orders failed', e);
  }

  // 2. Delivered but unpaid orders
  try {
    const { count: deliveredUnpaidCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'delivered')
      .eq('payment_status', 'unpaid');

    if (deliveredUnpaidCount && deliveredUnpaidCount > 0) {
      alerts.push({
        id: 'delivered-unpaid',
        type: 'delivered-unpaid',
        message: deliveredUnpaidCount === 1
          ? '1 orden entregada sin pagar'
          : `${deliveredUnpaidCount} órdenes entregadas sin pagar`,
        severity: 'critical',
        count: deliveredUnpaidCount,
        link: '/orders',
      });
    }
  } catch (e) {
    console.warn('Alert check: delivered unpaid failed', e);
  }

  // 3. Low stock ingredients
  try {
    const { data: lowStockItems } = await supabase
      .from('ingredients')
      .select('id, name, current_stock, minimum_stock')
      .lte('current_stock', 'minimum_stock');

    if (lowStockItems && lowStockItems.length > 0) {
      const criticalItems = lowStockItems.filter(
        (item: any) => Number(item.current_stock || 0) <= Number(item.minimum_stock || 0) * 0.5
      );
      const otherItems = lowStockItems.filter(
        (item: any) => Number(item.current_stock || 0) > Number(item.minimum_stock || 0) * 0.5
      );

      if (criticalItems.length > 0) {
        alerts.push({
          id: 'low-stock-critical',
          type: 'low-stock',
          message: criticalItems.length === 1
            ? `${criticalItems[0].name}: stock crítico`
            : `${criticalItems.length} ingredientes con stock crítico`,
          severity: 'critical',
          count: criticalItems.length,
          link: '/stock',
        });
      }

      if (otherItems.length > 0) {
        alerts.push({
          id: 'low-stock-warning',
          type: 'low-stock',
          message: otherItems.length === 1
            ? `${otherItems[0].name}: stock bajo`
            : `${otherItems.length} ingredientes con stock bajo`,
          severity: 'warning',
          count: otherItems.length,
          link: '/stock',
        });
      }
    }
  } catch (e) {
    console.warn('Alert check: low stock failed', e);
  }

  // 4. Today's pending deliveries (orders ready but not delivered)
  try {
    const { count: readyToDeliver } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ready');

    if (readyToDeliver && readyToDeliver > 0) {
      alerts.push({
        id: 'ready-to-deliver',
        type: 'ready',
        message: readyToDeliver === 1
          ? '1 orden lista para entregar'
          : `${readyToDeliver} órdenes listas para entregar`,
        severity: 'info',
        count: readyToDeliver,
        link: '/orders',
      });
    }
  } catch (e) {
    console.warn('Alert check: ready to deliver failed', e);
  }

  // 5. High expenses warning (check if today's manual expenses > 30% of today's revenue)
  try {
    const { data: expenses } = await supabase
      .from('financial_transactions')
      .select('amount')
      .eq('type', 'expense')
      .gte('created_at', todayStart);

    const { data: revenue } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'paid')
      .eq('status', 'delivered')
      .gte('delivered_at', todayStart);

    const totalExpenses = expenses?.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0) || 0;
    const totalRevenue = revenue?.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0) || 0;

    if (totalRevenue > 0 && totalExpenses > totalRevenue * 0.3) {
      alerts.push({
        id: 'high-expenses',
        type: 'expense',
        message: `Gastos elevados hoy: ${Math.round((totalExpenses / totalRevenue) * 100)}% de los ingresos`,
        severity: 'warning',
        amount: totalExpenses,
        link: '/finance',
      });
    }
  } catch (e) {
    console.warn('Alert check: high expenses failed', e);
  }

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
