import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BUSINESS_PHONE } from '../config/businessConfig';
import logo from '../assets/logopng.webp';
import { createEventRequest, type EventRequestItem } from '../services/eventRequestService';
import { fetchPublicMenuProducts } from '../services/productService';
import type { Product, ProductPresentation } from '../services/database';

type OrderLine = {
  key: string;
  productId: string;
  productName: string;
  presentationId: string;
  presentationName: string;
  quantity: number;
  unitPrice: number;
};

type BuilderState = Record<string, { presentationId: string; quantity: number }>;

const EVENT_TYPES = [
  { value: 'cumpleaños', label: 'Cumpleaños' },
  { value: 'casamiento', label: 'Casamiento' },
  { value: 'empresarial', label: 'Empresarial' },
  { value: 'bautismo', label: 'Bautismo' },
  { value: 'mesa dulce', label: 'Mesa dulce' },
  { value: 'otro', label: 'Otro' },
];

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateForMessage(value: string) {
  if (!value) return 'A definir';

  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function getPresentation(product: Product, presentationId: string) {
  return (product.product_presentations || []).find((presentation) => presentation.id === presentationId);
}

function buildLineKey(productId: string, presentationId: string) {
  return `${productId}-${presentationId}`;
}

export default function EventOrdersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [builderState, setBuilderState] = useState<BuilderState>({});
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    eventDate: '',
    eventType: 'cumpleaños',
    guestCount: '',
    comments: '',
  });

  useEffect(() => {
    let isMounted = true;

    fetchPublicMenuProducts()
      .then((menuProducts) => {
        if (!isMounted) return;

        setProducts(menuProducts);
        setBuilderState(
          menuProducts.reduce<BuilderState>((state, product) => {
            const firstPresentation = product.product_presentations?.[0];
            if (firstPresentation) {
              state[product.id] = { presentationId: firstPresentation.id, quantity: 1 };
            }
            return state;
          }, {})
        );
      })
      .catch((fetchError) => {
        console.error('Event products load failed:', fetchError);
        if (isMounted) {
          setError('No pudimos cargar las especialidades. Probá nuevamente en unos minutos.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const total = useMemo(
    () => orderLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    [orderLines]
  );

  const itemCount = useMemo(
    () => orderLines.reduce((sum, line) => sum + line.quantity, 0),
    [orderLines]
  );

  const canSubmit = formData.customerName.trim() && formData.phone.trim() && orderLines.length > 0 && !isSending;

  const handleBuilderChange = (productId: string, updates: Partial<BuilderState[string]>) => {
    setBuilderState((current) => ({
      ...current,
      [productId]: {
        presentationId: updates.presentationId ?? current[productId]?.presentationId ?? '',
        quantity: Math.max(1, updates.quantity ?? current[productId]?.quantity ?? 1),
      },
    }));
  };

  const addToOrder = (product: Product) => {
    const selected = builderState[product.id];
    const presentation = getPresentation(product, selected?.presentationId || '');

    if (!presentation) return;

    const quantity = Math.max(1, selected?.quantity || 1);
    const key = buildLineKey(product.id, presentation.id);

    setOrderLines((current) => {
      const existing = current.find((line) => line.key === key);

      if (existing) {
        return current.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + quantity } : line
        );
      }

      return [
        ...current,
        {
          key,
          productId: product.id,
          productName: product.name,
          presentationId: presentation.id,
          presentationName: presentation.name,
          quantity,
          unitPrice: Number(presentation.sale_price || 0),
        },
      ];
    });
  };

  const updateOrderQuantity = (key: string, quantity: number) => {
    setOrderLines((current) =>
      current
        .map((line) => (line.key === key ? { ...line, quantity: Math.max(0, quantity) } : line))
        .filter((line) => line.quantity > 0)
    );
  };

  const removeLine = (key: string) => {
    setOrderLines((current) => current.filter((line) => line.key !== key));
  };

  const buildRequestItems = (): EventRequestItem[] =>
    orderLines.map((line) => ({
      product_id: line.productId,
      product_name: line.productName,
      presentation_id: line.presentationId,
      presentation_name: line.presentationName,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      subtotal: line.quantity * line.unitPrice,
    }));

  const buildWhatsAppMessage = () => {
    const eventTypeLabel = EVENT_TYPES.find((type) => type.value === formData.eventType)?.label || formData.eventType;
    const orderText = orderLines
      .map((line) => `• ${line.quantity} ${line.presentationName} ${line.productName} — ${formatPrice(line.quantity * line.unitPrice)}`)
      .join('\n');

    return [
      'Hola! 👋',
      'Quiero solicitar un presupuesto para un evento.',
      '',
      '📅 Fecha:',
      formatDateForMessage(formData.eventDate),
      '',
      '🎉 Tipo de evento:',
      eventTypeLabel,
      '',
      '👥 Personas aproximadas:',
      formData.guestCount.trim() || 'A definir',
      '',
      '🧁 Pedido:',
      orderText,
      '',
      '💰 Total estimado:',
      formatPrice(total),
      '',
      '👤 Nombre:',
      formData.customerName.trim(),
      '',
      '📞 Teléfono:',
      formData.phone.trim(),
      '',
      '✍️ Comentarios:',
      formData.comments.trim() || 'Sin comentarios.',
    ].join('\n');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) return;

    setIsSending(true);

    await createEventRequest({
      customer_name: formData.customerName.trim(),
      phone: formData.phone.trim(),
      event_date: formData.eventDate || null,
      event_type: formData.eventType,
      guest_count: formData.guestCount ? Number(formData.guestCount) : null,
      comments: formData.comments.trim(),
      estimated_total: total,
      items: buildRequestItems(),
    });

    const message = encodeURIComponent(buildWhatsAppMessage());
    window.location.href = `https://wa.me/${BUSINESS_PHONE}?text=${message}`;
    setIsSending(false);
  };

  return (
    <main className="events-page">
      <section className="events-hero">
        <div className="events-hero-inner">
          <img src={logo} alt="DeLaCasa" className="events-logo" />
          <p className="events-kicker">Pedidos especiales y eventos</p>
          <h1>Armá tu mesa dulce artesanal</h1>
          <p>
            Elegí presentaciones, calculá un estimado y envianos tu consulta para coordinar cada detalle.
          </p>
        </div>
      </section>

      <section className="events-layout" aria-label="Constructor de pedidos para eventos">
        <div className="events-main-column">
          <div className="events-section-heading">
            <span />
            <h2>Especialidades</h2>
            <span />
          </div>

          {error && <div className="events-message events-message-error">{error}</div>}
          {!error && isLoading && <div className="events-message">Preparando el catálogo...</div>}
          {!error && !isLoading && products.length === 0 && (
            <div className="events-message">Muy pronto vas a encontrar opciones para eventos por acá.</div>
          )}

          {!error && products.length > 0 && (
            <div className="events-product-grid">
              {products.map((product) => {
                const selected = builderState[product.id];
                const presentation = getPresentation(product, selected?.presentationId || '') as ProductPresentation | undefined;
                const quantity = selected?.quantity || 1;

                return (
                  <article key={product.id} className="events-product-card">
                    <div className="events-card-top">
                      <div>
                        <p>{product.category || 'Especialidad'}</p>
                        <h3>{product.name}</h3>
                      </div>
                      <span aria-hidden="true">✦</span>
                    </div>

                    {product.description && <p className="events-product-description">{product.description}</p>}

                    <label>
                      Presentación
                      <select
                        value={selected?.presentationId || ''}
                        onChange={(event) => handleBuilderChange(product.id, { presentationId: event.target.value })}
                      >
                        {(product.product_presentations || []).map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name} - {formatPrice(option.sale_price)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="events-card-actions">
                      <div className="events-quantity-control" aria-label={`Cantidad para ${product.name}`}>
                        <button
                          type="button"
                          onClick={() => handleBuilderChange(product.id, { quantity: quantity - 1 })}
                          aria-label="Restar cantidad"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(event) => handleBuilderChange(product.id, { quantity: Number(event.target.value) || 1 })}
                          aria-label="Cantidad"
                        />
                        <button
                          type="button"
                          onClick={() => handleBuilderChange(product.id, { quantity: quantity + 1 })}
                          aria-label="Sumar cantidad"
                        >
                          +
                        </button>
                      </div>

                      <div className="events-card-price">
                        <span>Estimado</span>
                        <strong>{formatPrice((presentation?.sale_price || 0) * quantity)}</strong>
                      </div>
                    </div>

                    <button type="button" className="events-add-button" onClick={() => addToOrder(product)}>
                      Agregar al pedido
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          <form className="events-form" onSubmit={handleSubmit}>
            <div className="events-section-heading">
              <span />
              <h2>Datos del evento</h2>
              <span />
            </div>

            <div className="events-form-grid">
              <label>
                Nombre
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(event) => setFormData((current) => ({ ...current, customerName: event.target.value }))}
                  placeholder="Tu nombre"
                  required
                />
              </label>

              <label>
                Teléfono
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="351..."
                  required
                />
              </label>

              <label>
                Fecha del evento
                <input
                  type="date"
                  value={formData.eventDate}
                  onChange={(event) => setFormData((current) => ({ ...current, eventDate: event.target.value }))}
                />
              </label>

              <label>
                Tipo de evento
                <select
                  value={formData.eventType}
                  onChange={(event) => setFormData((current) => ({ ...current, eventType: event.target.value }))}
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Cantidad aproximada de personas
                <input
                  type="number"
                  min="1"
                  value={formData.guestCount}
                  onChange={(event) => setFormData((current) => ({ ...current, guestCount: event.target.value }))}
                  placeholder="Ej. 40"
                />
              </label>

              <label className="events-form-wide">
                Comentarios
                <textarea
                  value={formData.comments}
                  onChange={(event) => setFormData((current) => ({ ...current, comments: event.target.value }))}
                  placeholder="Horarios, entrega, sabores preferidos o detalles importantes."
                />
              </label>
            </div>

            <button type="submit" className="events-whatsapp-button" disabled={!canSubmit}>
              {isSending ? 'Preparando consulta...' : 'Solicitar presupuesto'}
            </button>
          </form>
        </div>

        <aside className="events-summary" aria-label="Resumen del pedido">
          <div className="events-summary-card">
            <div className="events-summary-header">
              <div>
                <p>Resumen del pedido</p>
                <h2>{itemCount} unidades</h2>
              </div>
              <span>{formatPrice(total)}</span>
            </div>

            {orderLines.length === 0 ? (
              <p className="events-empty-summary">Sumá especialidades para ver el total estimado en vivo.</p>
            ) : (
              <div className="events-summary-lines">
                {orderLines.map((line) => (
                  <div key={line.key} className="events-summary-line">
                    <div>
                      <strong>
                        {line.quantity} {line.presentationName}
                      </strong>
                      <span>{line.productName}</span>
                      <small>{formatPrice(line.quantity * line.unitPrice)}</small>
                    </div>
                    <div className="events-summary-controls">
                      <button type="button" onClick={() => updateOrderQuantity(line.key, line.quantity - 1)} aria-label="Restar">
                        -
                      </button>
                      <button type="button" onClick={() => updateOrderQuantity(line.key, line.quantity + 1)} aria-label="Sumar">
                        +
                      </button>
                      <button type="button" onClick={() => removeLine(line.key)} aria-label="Quitar">
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="events-total-row">
              <span>Total estimado</span>
              <strong>{formatPrice(total)}</strong>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
