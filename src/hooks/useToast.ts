import { useState, useRef, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  
  // Usamos una ref para guardar el ID del timer y poder cancelarlo
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string) => {
    if (!msg) return; // Evitar mensajes vacíos
    // 1. Si ya había un timer corriendo, lo matamos
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 2. Seteamos el nuevo mensaje
    setToast(msg);

    // 3. Iniciamos el timer y guardamos su ID
    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, 2500);
  }, []);

  return { toast, show };
}