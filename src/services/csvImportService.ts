import { createOrderWithItems, updatePaymentStatus, updateOrderStatus } from './orderService';
import { fetchProducts } from './productService';

export type CsvRow = {
  Estado: string;
  Cantidad: string;
  Nombre: string;
  'Para cuando?': string;
  'pagado?': string;
  Notas: string;
};

export type ParsedOrder = {
  customerName: string;
  quantity: number;
  presentationName: string;
  productId: string;
  presentationId: string;
  status: 'pending' | 'delivered';
  paymentStatus: 'unpaid' | 'paid';
  deliveryDate?: string;
  notes?: string;
  unitPrice: number;
};

// Quantity to presentation mapping
const QUANTITY_PRESENTATION_MAP: Record<number, string> = {
  4: 'Caja x4',
  6: 'Media Docena',
  12: 'Docena',
  24: '2 Docenas',
};

function parseCsv(csvContent: string): CsvRow[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row as CsvRow;
  }).filter(row => row.Nombre && row.Cantidad);
}

function mapStatus(estado: string): 'pending' | 'delivered' {
  return estado.toLowerCase() === 'entregado' ? 'delivered' : 'pending';
}

function mapPaymentStatus(pagado: string): 'unpaid' | 'paid' {
  return pagado.toLowerCase() === 'pagado' ? 'paid' : 'unpaid';
}

function parseDeliveryDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  // Try various date formats
  const match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    const [, day, month, year] = match;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return undefined;
}

export async function parseCsvOrders(csvContent: string): Promise<ParsedOrder[]> {
  const rows = parseCsv(csvContent);
  const products = await fetchProducts();

  // Find Alfajores de Maicena product
  const alfajoresProduct = products.find(p =>
    p.name.toLowerCase().includes('alfajor') && p.name.toLowerCase().includes('maicena')
  );

  if (!alfajoresProduct) {
    throw new Error('Product "Alfajores de Maicena" not found');
  }

  // Build presentation map
  const presentationMap = new Map<string, { id: string; productId: string }>();
  alfajoresProduct.product_presentations?.forEach(p => {
    presentationMap.set(p.name, { id: p.id, productId: alfajoresProduct.id });
  });

  return rows.map(row => {
    const quantity = parseInt(row.Cantidad, 10);
    const presentationName = QUANTITY_PRESENTATION_MAP[quantity];
    const presentation = presentationName ? presentationMap.get(presentationName) : undefined;

    if (!presentationName || !presentation) {
      throw new Error(`Invalid quantity: ${quantity}. Valid quantities: ${Object.keys(QUANTITY_PRESENTATION_MAP).join(', ')}`);
    }

    return {
      customerName: row.Nombre,
      quantity,
      presentationName,
      productId: alfajoresProduct.id,
      presentationId: presentation.id,
      status: mapStatus(row.Estado),
      paymentStatus: mapPaymentStatus(row['pagado?']),
      deliveryDate: parseDeliveryDate(row['Para cuando?']),
      notes: row.Notas || undefined,
      unitPrice: alfajoresProduct.sale_price,
    };
  });
}

export async function importOrders(orders: ParsedOrder[]): Promise<string[]> {
  const orderIds: string[] = [];

  for (const order of orders) {
    const orderId = await createOrderWithItems(
      order.customerName,
      '',
      [{
        product_id: order.productId,
        presentation_id: order.presentationId,
        quantity: order.quantity,
        unit_price: order.unitPrice,
        unit_cost: order.unitPrice * 0.5, // Placeholder
        subtotal: order.unitPrice * order.quantity,
        profit: order.unitPrice * order.quantity * 0.5, // Placeholder
      }]
    );
    orderIds.push(orderId);

    // Set payment status
    if (order.paymentStatus === 'paid') {
      await updatePaymentStatus(orderId, 'paid', 'cash');
    }

    // Set order status
    if (order.status === 'delivered') {
      await updateOrderStatus(orderId, 'delivered');
    }
  }

  return orderIds;
}

export { parseCsv };