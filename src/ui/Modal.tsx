import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string | number;
}

/**
 * Modal unificado para toda la aplicación.
 * Usa las clases CSS globales .overlay y .dialog para consistencia visual.
 * Maneja cierre por click en overlay y tecla Escape.
 */
export function Modal({ isOpen, onClose, title, children, footer, maxWidth = '520px' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKey);
    // Bloquear scroll del body mientras el modal está abierto
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
        style={{ maxWidth, width: '90%' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="dialog-title">{title}</div>

        <div>{children}</div>

        {footer && <div className="dialog-actions">{footer}</div>}
      </div>
    </div>
  );
}
