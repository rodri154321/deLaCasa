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
    product_presentation_id: item.product_presentation_id,
    quantity: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0,
  }));

  console.log('Order creation payload:', payload);

  const { data, error } = await supabase.rpc(ORDER_RPC, {
    p_customer_name: customerName.trim(),
    p_customer_email: customerEmail.trim(),
    p_items: payload,
  });

  if (error) {
    console.error('Supabase order creation error:', error);
    throw error;
  }

  return data as string;
}

export async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, customer_name, customer_email, total_amount, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data as Order[];
}
