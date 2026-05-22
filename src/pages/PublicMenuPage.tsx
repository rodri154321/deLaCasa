import { useEffect, useMemo, useState } from 'react';
import SplashScreen from '../components/SplashScreen';
import PromoModal from '../components/PromoModal';
import { promoConfig } from '../config/promoConfig';
import { fetchPublicMenuProducts } from '../services/productService';
import type { Product } from '../services/database';
import logo from '../assets/logopng.webp';

const SPLASH_DURATION = 1500;
const SPLASH_FADE_DURATION = 350;

function formatMenuPrice(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatQuantity(quantity: number) {
  const safeQuantity = Number(quantity || 0);
  return safeQuantity === 1 ? '1 unidad' : `${safeQuantity} unidades`;
}

function normalizeCategory(category?: string | null) {
  return category?.trim() || 'Especialidades';
}

export default function PublicMenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSplashLeaving, setIsSplashLeaving] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPromo, setShowPromo] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const splashTimer = window.setTimeout(() => {
      setIsSplashLeaving(true);

      window.setTimeout(() => {
        if (isMounted) {
          setShowSplash(false);
        }
      }, SPLASH_FADE_DURATION);
    }, SPLASH_DURATION);

    fetchPublicMenuProducts()
      .then((menuProducts) => {
        if (isMounted) {
          setProducts(menuProducts);
        }
      })
      .catch((fetchError) => {
        console.error('Public menu load failed:', fetchError);
        if (isMounted) {
          setError('No pudimos cargar el menú. Probá nuevamente en unos minutos.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      window.clearTimeout(splashTimer);
    };
  }, []);

  /* Promo modal: auto-show after splash, once per session, only if enabled */
  useEffect(() => {
    if (showSplash || !promoConfig.enabled) return;

    const alreadyDismissed = sessionStorage.getItem('promo-dismissed-session') === 'true';
    if (alreadyDismissed) return;

    // small delay after catalog visible for premium feel
    const promoTimer = window.setTimeout(() => {
      setShowPromo(true);
    }, 420);

    return () => window.clearTimeout(promoTimer);
  }, [showSplash]);

  const sections = useMemo(() => {
    const groupedProducts = products.reduce<Record<string, Product[]>>((groups, product) => {
      const category = normalizeCategory(product.category);

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(product);
      return groups;
    }, {});

    return Object.entries(groupedProducts)
      .sort(([categoryA], [categoryB]) => categoryA.localeCompare(categoryB, 'es'))
      .map(([category, categoryProducts]) => ({
        category,
        products: categoryProducts.sort((a, b) => a.name.localeCompare(b.name, 'es')),
      }));
  }, [products]);

  const handleClosePromo = () => {
    setShowPromo(false);
    sessionStorage.setItem('promo-dismissed-session', 'true');
  };

  return (
    <div className="public-menu-shell">
      {showSplash && <SplashScreen isLeaving={isSplashLeaving} />}

      <main className={`public-menu-page ${showSplash ? 'public-menu-hidden' : 'public-menu-visible'}`}>
        <section className="public-menu-card">
          <header className="public-menu-header">
            <img src={logo} alt="DeLaCasa" className="public-menu-logo" />
            <p className="public-menu-kicker">Alfajorería artesanal</p>
            <h1>DeLaCasa</h1>
          </header>

          <div className="public-menu-divider" aria-hidden="true">
            <span />
            <strong>Menú</strong>
            <span />
          </div>

          {error && (
            <div className="public-menu-message public-menu-message-error">
              {error}
            </div>
          )}

          {!error && isLoading && (
            <div className="public-menu-message">
              Preparando el menú...
            </div>
          )}

          {!error && !isLoading && sections.length === 0 && (
            <div className="public-menu-message">
              Muy pronto vas a encontrar nuestras especialidades por acá.
            </div>
          )}

          {!error && sections.length > 0 && (
            <div className="public-menu-sections">
              {sections.map((section) => (
                <section key={section.category} className="public-menu-section">
                  <div className="public-menu-section-title">
                    <span />
                    <h2>{section.category}</h2>
                    <span />
                  </div>

                  <div className="public-menu-products">
                    {section.products.map((product) => (
                      <article key={product.id} className="public-menu-product">
                        <div className="public-menu-product-heading">
                          <div>
                            <h3>{product.name}</h3>
                            {product.description && <p>{product.description}</p>}
                          </div>
                        </div>

                        <div className="public-menu-presentations">
                          {(product.product_presentations || []).map((presentation) => (
                            <div key={presentation.id} className="public-menu-presentation">
                              <div>
                                <span className="public-menu-presentation-name">{presentation.name}</span>
                                <span className="public-menu-presentation-qty">{formatQuantity(presentation.quantity)}</span>
                              </div>
                              <span className="public-menu-dots" aria-hidden="true" />
                              <strong>{formatMenuPrice(presentation.sale_price)}</strong>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <footer className="public-menu-footer">
            <p>Pedidos y consultas</p>
            <span>Hecho artesanalmente</span>
          </footer>
        </section>
      </main>

      {!showSplash && (
        <PromoModal isOpen={showPromo} onClose={handleClosePromo} />
      )}
    </div>
  );
}
