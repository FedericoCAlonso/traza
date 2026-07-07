// ═══════════════════════════════════════════════════════════════════════════
// MODULE: renderer/index.ts
// Punto de entrada público del motor de renderizado.
// ═══════════════════════════════════════════════════════════════════════════

import { buildSegs } from '../geometry';
import { getLayout, getBboxOffset } from './layout';
import { render, renderHoja } from './renderLocal';
import { renderMaster, renderMasterContent, renderMasterConnections } from './renderMaster';

export const RENDERER = {
  buildSegs,
  getLayout,
  getBboxOffset,
  render,
  renderHoja,
  renderMaster,
  renderMasterContent,
  renderMasterConnections,
};
