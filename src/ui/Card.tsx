// ═══════════════════════════════════════════════════════════════════════════
// MODULE: components/Card.jsx
// Tarjeta colapsable del feed.
// En React: src/components/Card.tsx
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';

interface CardProps {
  idx: string;
  idxColor?: string;
  title: string;
  badge?: string;
  onRemove?: () => void;
  onEdit?: () => void;
  onSelect?: () => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
  customHeader?: React.ReactNode;
  className?: string;
}

export function Card({ idx, idxColor='var(--acc)', title, badge, onRemove, onEdit, onSelect, children, defaultOpen=true, customHeader, className='' }: CardProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className={`card ${className}`}>
      <div className={`card-hdr ${open?'open':''}`} onClick={()=>{
        if (onSelect) onSelect();
        setOpen(o=>!o);
      }}>
        <span className="card-idx" style={{color:idxColor}}>{idx}</span>
        <span className="card-title-main">{title}</span>
        {badge && <span className="card-badge">{badge}</span>}
        {customHeader && <div style={{ marginRight: 8 }}>{customHeader}</div>}
        <div style={{ display: 'flex', gap: '4px' }}>
          {onEdit && (
            <button className="btn btn-ghost btn-xs btn-icon"
              onClick={e=>{e.stopPropagation();onEdit();}} title="Editar">✏️</button>
          )}
          {onRemove && (
            <button className="btn btn-danger btn-xs btn-icon"
              onClick={e=>{e.stopPropagation();onRemove();}} title="Eliminar">✕</button>
          )}
        </div>
        <span className={`card-chevron ${open?'open':''}`}>▶</span>
      </div>
      {open && <div className="card-body">{children}</div>}
    </div>
  );
}