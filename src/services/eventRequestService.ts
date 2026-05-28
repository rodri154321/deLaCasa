import { supabase } from './supabaseClient';

export type EventRequestItem = {
  product_id: string;
  product_name: string;
  presentation_id: string;
  presentation_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export type EventRequestPayload = {
  customer_name: string;
  phone: string;
  event_date: string | null;
  event_type: string;
  guest_count: number | null;
  comments: string;
  estimated_total: number;
  items: EventRequestItem[];
};

export async function createEventRequest(payload: EventRequestPayload) {
  const { data, error } = await supabase
    .from('event_requests')
    .insert({
      ...payload,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.warn('Supabase createEventRequest skipped:', error);
    return null;
  }

  return data;
}
