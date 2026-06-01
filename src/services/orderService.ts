import { supabase } from './supabaseClient';
import type { Order, OrderItemPayload } from './database';

const ORDER_RPC = 'insert_order_with_items';

export async function createOrderWithItems(
  customerName: string,
  customerEmail: string,
  items: OrderItemPayload[]
) {
  const payload = items.map((item) => ({
    product_id: item.product_id,
    presentation_id: item.presentation_id,
    quantity: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0,
    unit_price: Number.isFinite(Number(item.unit_price)) ? Number(item.unit_price) : 0,
    unit_cost: Number.isFinite(Number(item.unit_cost)) ? Number(item.unit_cost) : 0,
    subtotal: Number.isFinite(Number(item.subtotal)) ? Number(item.subtotal) : 0,
    profit: Number.isFinite(Number(item.profit)) ? Number(item.profit) : 0,
  }));

  const { data, error } = await supabase.rpc(ORDER_RPC, {
    p_customer_name: customerName.trim(),
    p_customer_email: customerEmail.trim(),
    p_items: payload,
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        product_id,
        presentation_id,
        quantity,
        unit_price,
        unit_cost,
        subtotal,
        profit,
        created_at,
        products (
          id,
          name
        ),
        product_presentations (
          id,
          name,
          quantity,
          sale_price
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data as Order[];
}

export async function updateOrderStatus(orderId: string, status: Order['status']) {
  const updateData: Partial<Order> = { status };
  if (status === 'delivered') {
    updateData.delivered_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Order;
}

export async function updatePaymentStatus(orderId: string, paymentStatus: Order['payment_status'], paymentMethod?: Order['payment_method']) {
  const updateData: Partial<Order> = { payment_status: paymentStatus };
  if (paymentMethod) {
    updateData.payment_method = paymentMethod;
  }
  if (paymentStatus === 'paid') {
    updateData.paid_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Order;
}

export async function fetchOrderById(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        product_id,
        presentation_id,
        quantity,
        unit_price,
        unit_cost,
        subtotal,
        profit,
        created_at,
        products (
          id,
          name
        ),
        product_presentations (
          id,
          name,
          quantity,
          sale_price
        )
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    throw error;
  }

  return data as Order & {
    order_items: Array<{
      id: string;
      product_id: string;
      presentation_id: string;
      quantity: number;
      unit_price: number;
      unit_cost?: number;
      subtotal?: number;
      profit?: number;
      created_at: string;
      products: { id: string; name: string };
      product_presentations: { id: string; name: string; quantity: number; sale_price?: number };
    }>;
  };
}

export async function addOrderItem(orderId: string, item: {
  product_id: string;
  presentation_id: string;
  quantity: number;
  unit_price: number;
  unit_cost?: number;
  subtotal?: number;
  profit?: number;
}) {
  const subtotal = item.subtotal ?? item.unit_price * item.quantity;
  const unitCost = item.unit_cost ?? subtotal * 0.5;
  const profit = item.profit ?? subtotal * 0.5;

  const { data, error } = await supabase
    .from('order_items')
    .insert({
      order_id: orderId,
      product_id: item.product_id,
      presentation_id: item.presentation_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      unit_cost: unitCost,
      subtotal,
      profit,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateOrderItemQuantity(itemId: string, quantity: number) {
  const { data: existing, error: fetchError } = await supabase
    .from('order_items')
    .select('unit_price, order_id')
    .eq('id', itemId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  const unitPrice = existing.unit_price || 0;
  const subtotal = unitPrice * quantity;

  const { data, error } = await supabase
    .from('order_items')
    .update({
      quantity,
      subtotal,
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteOrderItem(itemId: string) {
  const { error } = await supabase
    .from('order_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    throw error;
  }
}

export async function recalculateOrderTotal(orderId: string) {
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('subtotal')
    .eq('order_id', orderId);

  if (itemsError) {
    throw itemsError;
  }

  const total = (items || []).reduce((sum, item) => sum + (item.subtotal || 0), 0);

  const { data, error } = await supabase
    .from('orders')
    .update({ total_amount: total })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Order;
}