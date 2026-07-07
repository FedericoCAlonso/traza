import type { Circuito, Tablero } from '../types/index';

/**
 * Retorna el nombre completo de un circuito, incluyendo el nombre de su tablero asignado.
 * Ej: Si el tablero es "TS1" y el circuito es "C1", retorna "TS1.C1".
 * Si no tiene tablero asignado, retorna solo el nombre del circuito.
 */
export function getFullCircuitName(circuito: Pick<Circuito, 'nombre' | 'tableroId'>, tableros: Pick<Tablero, 'id' | 'nombre'>[]): string {
  if (!circuito || !circuito.nombre) return '—';
  if (!circuito.tableroId) return circuito.nombre;
  
  const tablero = tableros.find(t => t.id === circuito.tableroId);
  return tablero ? `${tablero.nombre}.${circuito.nombre}` : circuito.nombre;
}

import type { ElementoElectrico } from '../types/index';
import type { DefinicionSimbolo } from './symbols';

/**
 * Determina si un Elemento Eléctrico cuenta como 'Boca' (punto de utilización)
 * según la norma AEA 90364.
 * Excluye tableros, cajas de pase y llaves de efecto.
 */
export function isBocaElectrica(el: ElementoElectrico, symbolsLib: DefinicionSimbolo[]): boolean {
  if (el.esTablero) return false;
  if (el.tipo.includes('tablero') || el.tipo.includes('llave') || el.tipo.includes('caja-pase')) return false;
  
  const def = symbolsLib.find(s => s.id === el.tipo);
  if (def) {
    if (def.categoria === 'tableros' || def.categoria === 'llaves' || def.categoria === 'cajas_pase') {
      return false;
    }
  }
  return true;
}
