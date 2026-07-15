import type { Pared } from '../types/index';

export function exportParedesToCSV(paredes: Pared[]): string {
  const header = 'Indice,Largo_m,Angulo_grados,Espesor_cm\n';
  const rows = paredes.map((p, idx) => {
    const largo = p.largo === 'auto' ? 'auto' : p.largo.toString();
    const espesor = p.grosor !== null ? (p.grosor * 100).toFixed(0) : '0';
    return `${idx + 1},${largo},${p.angulo},${espesor}`;
  });
  return header + rows.join('\n');
}

export function importParedesFromCSV(csvContent: string, grosorParedDefault: number): Pared[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length <= 1) return []; // Only header or empty
  
  const result: Pared[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length < 3) continue; // At least Index, Largo, Angulo
    
    const largoStr = parts[1].trim();
    const largo: number | 'auto' = largoStr.toLowerCase() === 'auto' ? 'auto' : parseFloat(largoStr);
    
    const angulo = parseFloat(parts[2].trim());
    
    let grosor: number | null = grosorParedDefault;
    if (parts.length >= 4) {
      const espesorCm = parseFloat(parts[3].trim());
      if (!isNaN(espesorCm) && espesorCm > 0) {
        grosor = espesorCm / 100;
      } else if (espesorCm === 0) {
        grosor = null;
      }
    }
    
    result.push({
      id: Date.now().toString() + '-' + i,
      largo: isNaN(largo as number) && largo !== 'auto' ? 1 : largo,
      angulo: isNaN(angulo) ? 0 : angulo,
      grosor,
      esquina_saliente: null,
      irregularidades: []
    });
  }
  
  return result;
}
