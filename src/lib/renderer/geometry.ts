// ═══════════════════════════════════════════════════════════════════════════
// MODULE: renderer/geometry.ts
// Construcción de segmentos y geometría base a partir del modelo.
// ═══════════════════════════════════════════════════════════════════════════
import * as GEO from '../geometry';
import type { Ambiente, Meta, Pared } from '../../types/index';
import { getAmbienteParedes } from '../storage';

/**
 * Genera los segmentos geométricos procesados a partir de la lista plana de paredes.
 * Devuelve chains (cadenas de segmentos) en lugar de tramos.
 */
export function buildSegs(ambiente: Ambiente, meta: Meta) {
  const paredes = getAmbienteParedes(ambiente);
  const sentidoN = ambiente.sentido === 'horario' ? 1 : -1;
  const paredesConGrosor = paredes.map((p: Pared) => ({
    ...p,
    grosor: p.grosor ?? meta.grosor_pared_default
  }));
  const segs = GEO.construirEjes(paredesConGrosor, meta.escala, sentidoN, 0, 0);
  GEO.calcularVectores(segs, sentidoN);
  const chains = GEO.computeChains(segs);
  return { chains, allSegs: segs };
}
