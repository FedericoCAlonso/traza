// ═══════════════════════════════════════════════════════════════════════════
// MODULE: components/Field.jsx
// Wrapper de campo de formulario.
// En React: src/components/Field.tsx
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';

interface FieldProps {
  label: string;
  children: React.ReactNode;
  row?: boolean;
}

export function F({ label, children, row=false }: FieldProps) {
  return (
    <div className={row ? 'field-row' : 'field'}>
      {!row && <label>{label}</label>}
      {children}
    </div>
  );
}