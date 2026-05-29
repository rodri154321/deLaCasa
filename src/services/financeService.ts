import { supabase } from './supabaseClient';

export type TransactionType = 'income' | 'expense';

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  description: string | null;
  created_at: string;
}

// ============================================
// EXPENSE CATEGORIES
// ============================================
export const EXPENSE_CATEGORIES = [
  'ingredientes',
  'packaging',
  'delivery',
  'publicidad',
  'herramientas',
  'servicios',
  'alquiler',
  'otros',
];

// ============================================
// INCOME CATEGORIES
// ============================================
export const INCOME_CATEGORIES = [
  'venta manual',
  'evento',
  'transferencia',
  'efectivo',
  'mercadopago',
  'otros',
];

// ============================================
// CREATE
// ============================================
export async function createFinancialTransaction(
  type: TransactionType,
  category: string,
  amount: number,
  description?: string
): Promise<FinancialTransaction> {
  const { data, error } = await supabase
    .from('financial_transactions')
    .insert({
      type,
      category,
      amount: Math.abs(Number(amount)),
      description: description?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating financial transaction:', error);
    throw error;
  }

  return data as FinancialTransaction;
}

// ============================================
// READ
// ============================================
export async function fetchFinancialTransactions(
  filters?: { startDate?: string; endDate?: string; type?: TransactionType }
): Promise<FinancialTransaction[]> {
  let query = supabase
    .from('financial_transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lt('created_at', filters.endDate);
  }
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching financial transactions:', error);
    throw error;
  }

  return (data || []) as FinancialTransaction[];
}

// ============================================
// FINANCIAL METRICS
// ============================================
export interface FinancePeriodMetrics {
  income: number;
  expenses: number;
  net_profit: number;
}

export async function fetchFinancePeriodMetrics(
  startDate: string,
  endDate: string
): Promise<FinancePeriodMetrics> {
  // Fetch all transactions in the period
  const transactions = await fetchFinancialTransactions({ startDate, endDate });

  // Calculate totals using ONLY manual transactions
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  return {
    income,
    expenses,
    net_profit: income - expenses,
  };
}

// ============================================
// DETAILED FINANCE METRICS (Orders + Manual Transactions)
// ============================================
export interface DetailedFinanceMetrics {
  order_revenue: number;
  manual_income: number;
  total_income: number;
  expenses: number;
  net_profit: number;
}

export async function fetchDetailedFinanceMetrics(
  startDate: string,
  endDate: string
): Promise<DetailedFinanceMetrics> {
  const { data: paidOrders, error: ordersError } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('payment_status', 'paid')
    .gte('paid_at', startDate)
    .lt('paid_at', endDate);

  if (ordersError) {
    console.error('Error fetching paid orders for finance:', ordersError);
  }

  const order_revenue = paidOrders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;

  const manualTransactions = await fetchFinancialTransactions({ startDate, endDate });

  const manual_income = manualTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const expenses = manualTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const total_income = order_revenue + manual_income;

  return {
    order_revenue,
    manual_income,
    total_income,
    expenses,
    net_profit: total_income - expenses,
  };
}

// ============================================
// DELETE
// ============================================
export async function deleteFinancialTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('financial_transactions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting financial transaction:', error);
    throw error;
  }
}

// ============================================
// DATE HELPERS
// ============================================
export function getLocalDateRange(period: 'today' | 'week' | 'month'): { start: string; end: string } {
  const now = new Date();

  switch (period) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    case 'week': {
      const day = now.getDay(); // 0 = Sunday
      const diff = now.getDate() - day;
      const start = new Date(now.getFullYear(), now.getMonth(), diff);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    default:
      return { start: now.toISOString(), end: now.toISOString() };
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
