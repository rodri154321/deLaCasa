import { supabase } from './supabaseClient';
import type { Product, ProductPresentation } from './database';

export type ProductPayload = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'product_presentations'> & {
  product_presentations?: PresentationPayload[];
};

export type PresentationPayload = {
  id?: string;
  name: string;
  quantity: number;
  sale_price: number;
  active?: boolean;
};

function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePresentation(presentation: PresentationPayload) {
  return {
    name: presentation.name.trim(),
    quantity: toSafeNumber(presentation.quantity),
    sale_price: toSafeNumber(presentation.sale_price),
    active: presentation.active ?? true,
  };
}

async function replaceProductPresentations(productId: string, presentations: PresentationPayload[]) {
  const { data: existing, error: fetchError } = await supabase
    .from('product_presentations')
    .select('id')
    .eq('product_id', productId);

  if (fetchError) {
    throw fetchError;
  }

  const normalized = presentations.map(normalizePresentation);
  const existingIds = new Set((existing || []).map((presentation) => presentation.id));
  const incomingIds = new Set(
    presentations
      .map((presentation) => presentation.id)
      .filter((id): id is string => Boolean(id && existingIds.has(id)))
  );

  const idsToDeactivate = [...existingIds].filter((id) => !incomingIds.has(id));
  if (idsToDeactivate.length > 0) {
    const { error } = await supabase
      .from('product_presentations')
      .update({ active: false })
      .in('id', idsToDeactivate);

    if (error) {
      throw error;
    }
  }

  await Promise.all(
    normalized.map(async (presentation, index) => {
      const presentationId = presentations[index].id;

      if (presentationId && existingIds.has(presentationId)) {
        const { error } = await supabase
          .from('product_presentations')
          .update(presentation)
          .eq('id', presentationId);

        if (error) {
          throw error;
        }
        return;
      }

      const { error } = await supabase
        .from('product_presentations')
        .insert({ ...presentation, product_id: productId });

      if (error) {
        throw error;
      }
    })
  );
}

export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_presentations (
        id,
        product_id,
        name,
        quantity,
        sale_price,
        active,
        created_at
      )
    `)
    .order('name');

  if (error) {
    throw error;
  }

  return (data || []).map((product) => ({
    ...product,
    product_presentations: ((product as Product).product_presentations || [])
      .map((presentation: ProductPresentation) => ({
        ...presentation,
        quantity: toSafeNumber(presentation.quantity),
        sale_price: toSafeNumber(presentation.sale_price),
      }))
      .sort((a: ProductPresentation, b: ProductPresentation) => a.quantity - b.quantity),
  })) as Product[];
}

export async function fetchPublicMenuProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      category,
      active,
      product_presentations (
        id,
        product_id,
        name,
        quantity,
        sale_price,
        active,
        created_at
      )
    `)
    .eq('active', true)
    .order('category')
    .order('name');

  if (error) {
    console.error('Supabase fetchPublicMenuProducts error:', error);
    throw error;
  }

  return (data || [])
    .map((product) => ({
      ...product,
      product_presentations: ((product as Product).product_presentations || [])
        .filter((presentation: ProductPresentation) => presentation.active !== false)
        .map((presentation: ProductPresentation) => ({
          ...presentation,
          quantity: toSafeNumber(presentation.quantity),
          sale_price: toSafeNumber(presentation.sale_price),
        }))
        .sort((a: ProductPresentation, b: ProductPresentation) => a.quantity - b.quantity),
    }))
    .filter((product) => product.product_presentations.length > 0) as Product[];
}

export async function createProduct(product: ProductPayload) {
  const payload = {
    name: product.name.trim(),
    description: product.description?.trim() || '',
    category: product.category?.trim() || '',
    active: product.active ?? true,
    sale_price: toSafeNumber(product.sale_price),
    estimated_cost: toSafeNumber(product.estimated_cost),
    current_stock: toSafeNumber(product.current_stock),
    minimum_stock: toSafeNumber(product.minimum_stock),
    production_time_minutes: toSafeNumber(product.production_time_minutes),
    units_per_batch: toSafeNumber(product.units_per_batch),
    sku: product.sku?.trim() || '',
    notes: product.notes?.trim() || '',
    image_url: product.image_url?.trim() || '',
  };

  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Supabase createProduct error:', error);
    throw error;
  }

  if (product.product_presentations?.length) {
    await replaceProductPresentations(data.id, product.product_presentations);
  }

  return (await fetchProductById(data.id)) as Product;
}

export async function fetchProductById(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_presentations (
        id,
        product_id,
        name,
        quantity,
        sale_price,
        active,
        created_at
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data as Product;
}

export async function fetchProductPresentations(productId: string) {
  const { data, error } = await supabase
    .from('product_presentations')
    .select('*')
    .eq('product_id', productId)
    .order('quantity');

  if (error) {
    throw error;
  }

  return data as ProductPresentation[];
}

export async function createProductPresentation(productId: string, presentation: PresentationPayload) {
  const { data, error } = await supabase
    .from('product_presentations')
    .insert({ ...normalizePresentation(presentation), product_id: productId })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as ProductPresentation;
}

export async function updateProductPresentation(id: string, presentation: Partial<PresentationPayload>) {
  const payload: Partial<PresentationPayload> = {};

  if (presentation.name !== undefined) payload.name = presentation.name.trim();
  if (presentation.quantity !== undefined) payload.quantity = toSafeNumber(presentation.quantity);
  if (presentation.sale_price !== undefined) payload.sale_price = toSafeNumber(presentation.sale_price);
  if (presentation.active !== undefined) payload.active = presentation.active;

  const { data, error } = await supabase
    .from('product_presentations')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as ProductPresentation;
}

export async function deleteProductPresentation(id: string) {
  const { error } = await supabase
    .from('product_presentations')
    .update({ active: false })
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function updateProduct(id: string, updates: Partial<ProductPayload>) {
  const { product_presentations, ...productUpdates } = updates;
  const payload: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'product_presentations'>> = { ...productUpdates };

  if (updates.sale_price !== undefined) payload.sale_price = toSafeNumber(updates.sale_price);
  if (updates.estimated_cost !== undefined) payload.estimated_cost = toSafeNumber(updates.estimated_cost);
  if (updates.current_stock !== undefined) payload.current_stock = toSafeNumber(updates.current_stock);
  if (updates.minimum_stock !== undefined) payload.minimum_stock = toSafeNumber(updates.minimum_stock);
  if (updates.production_time_minutes !== undefined) payload.production_time_minutes = toSafeNumber(updates.production_time_minutes);
  if (updates.units_per_batch !== undefined) payload.units_per_batch = toSafeNumber(updates.units_per_batch);

  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Supabase updateProduct error:', error);
    throw error;
  }

  if (product_presentations) {
    await replaceProductPresentations(id, product_presentations);
  }

  return (await fetchProductById(data.id)) as Product;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}
