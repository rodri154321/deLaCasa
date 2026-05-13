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
    .select('id, customer_name, customer_email, total_amount, status, payment_status, payment_method, delivered_at, paid_at, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }

  return data as Order[];
}

export async function updateOrderStatus(orderId: string, status: Order['status']) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error('Error updating order status:', error);
    throw error;
  }

  return data as Order;
}

export async function updatePaymentStatus(orderId: string, paymentStatus: Order['payment_status'], paymentMethod?: Order['payment_method']) {
  const updateData: Partial<Order> = { payment_status: paymentStatus };
  if (paymentMethod) {
    updateData.payment_method = paymentMethod;
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error('Error updating payment status:', error);
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
        created_at,
        products (
          id,
          name
        ),
        product_presentations (
          id,
          name,
          quantity
        )
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    console.error('Error fetching order by ID:', error);
    throw error;
  }

  return data as Order & {
    order_items: Array<{
      id: string;
      product_id: string;
      presentation_id: string;
      quantity: number;
      unit_price: number;
      created_at: string;
      products: { id: string; name: string };
      product_presentations: { id: string; name: string; quantity: number };
    }>;
  };
}
