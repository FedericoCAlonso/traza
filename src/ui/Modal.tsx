import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string | number;
}

/**
 * Modal unificado para toda la aplicación con diseño Material 3.
 * Incluye cabecera fija con botón cerrar, cuerpo desplazable y pie fijo.
 */
export function Modal({ isOpen, onClose, title, children, footer, maxWidth = '540px' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKey);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="dialog"
        style={{ maxWidth, width: '100%' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="dialog-header">
          <h3 className="dialog-title">{title}</h3>
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-icon"
            onClick={onClose}
            title="Cerrar"
            style={{ width: '32px', height: '32px', borderRadius: '50%', color: 'var(--on-surface-var)' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="dialog-body">{children}</div>

        {footer && <div className="dialog-actions">{footer}</div>}
      </div>
    </div>
  );
}
