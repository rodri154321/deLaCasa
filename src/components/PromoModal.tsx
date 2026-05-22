import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { promoConfig } from '../config/promoConfig';

interface PromoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PromoModal({ isOpen, onClose }: PromoModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!promoConfig.enabled) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="promo-backdrop"
            className="promo-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
          />

          <motion.div
            key="promo-content"
            className="promo-modal-content"
            role="dialog"
            aria-modal="true"
            aria-label={promoConfig.alt}
            initial={{ opacity: 0, scale: 0.96, x: '-50%', y: 'calc(-50% + 12px)' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.96, x: '-50%', y: 'calc(-50% + 12px)' }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="promo-modal-close"
              onClick={onClose}
              aria-label="Cerrar promoción"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <img
              src={promoConfig.image}
              alt={promoConfig.alt}
              className="promo-modal-image"
              draggable={false}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
