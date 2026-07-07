// ═══════════════════════════════════════════════════════════════════════════
// MODULE: components/NumInput.tsx
// Input numérico que maneja negativos sin bugs.
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';

interface NumInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function NumInput({ value, onChange, placeholder='', style={} }: NumInputProps) {
  // Mantener string interno para evitar conflictos con signo negativo
  const [str, setStr] = React.useState(String(value ?? ''));
  React.useEffect(() => { setStr(String(value ?? '')); }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    
    // Evitar el "0" inicial molesto: si era "0" y tipean "5", queda "05". Lo corregimos a "5".
    if (raw.length > 1 && raw.startsWith('0') && raw[1] !== '.') {
      raw = raw.replace(/^0+/, '') || '0';
    }
    if (raw.length > 2 && raw.startsWith('-0') && raw[2] !== '.') {
      raw = '-' + raw.replace(/^-0+/, '');
    }

    setStr(raw);
    
    // solo disparar onChange si es número válido
    if (raw === '' || raw === '-' || raw === '.') return;
    const n = parseFloat(raw);
    if (!isNaN(n)) onChange(n);
  };
  
  const handleBlur = () => {
    // al salir, normalizar
    const n = parseFloat(str);
    if (isNaN(n)) { 
      setStr(String(value ?? '')); 
      return; 
    }
    onChange(n);
    setStr(String(n));
  };

  return (
    <input
      type="text"
      value={str}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      style={style}
    />
  );
}
