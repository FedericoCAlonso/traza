import type { Project } from '../types/index';
import { calcularLongitudOrtogonal } from './electrical/calculations';
import { isBocaElectrica } from './circuitUtils';
import { getDefaultSymbolsSync } from './symbols';

/**
 * Descarga un archivo en el navegador.
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convierte un array de objetos a un string CSV y lo descarga.
 */
export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) {
    alert("No hay datos para exportar.");
    return;
  }
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h] ?? '';
      // Escape comillas y comas
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    }).join(',')
  );
  
  const csvContent = [headers.join(','), ...rows].join('\n');
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Genera el informe Markdown del Proyecto y lo descarga.
 */
export function exportToMarkdown(project: Project) {
  let md = `# Informe del Proyecto: ${project.nombre}\n\n`;
  md += `**Estado:** ${project.estado ?? 'Relevamiento'}\n`;
  md += `**Fecha:** ${new Date().toLocaleDateString()}\n\n`;

  md += `## Resumen de Hojas (Ambientes)\n`;
  project.ambientes.forEach((a) => {
    const bocasCount = a.elementos.filter(el => isBocaElectrica(el, getDefaultSymbolsSync())).length;
    md += `- **${a.nombre}**: ${bocasCount} bocas, ${a.aberturas.length} aberturas.\n`;
  });
  md += '\n';

  md += `## Circuitos\n`;
  if (!project.circuitos || project.circuitos.length === 0) {
    md += `*No hay circuitos definidos.*\n`;
  } else {
    project.circuitos.forEach(c => {
      md += `- **${c.nombre}** (${c.tipo}): ${c.seccionBase ? `${c.seccionBase}mm²` : 'N/A'}\n`;
    });
  }
  md += '\n';

  md += `## Bocas e Infraestructura\n`;
  const totalBocas = project.ambientes.reduce((acc, a) => acc + a.elementos.filter(el => isBocaElectrica(el, getDefaultSymbolsSync())).length, 0);
  md += `**Total de Bocas:** ${totalBocas}\n\n`;

  project.ambientes.forEach(a => {
    if (a.elementos.length === 0) return;
    md += `### Hoja: ${a.nombre}\n`;
    a.elementos.forEach(el => {
      const circ = project.circuitos?.find(c => c.id === el.circuitoId);
      md += `- ${el.referencia || 'S/R'} [${el.tipo}]: Altura ${el.altura || 0}m. Circuito: ${circ ? circ.nombre : 'Ninguno'}\n`;
    });
    md += '\n';
  });

  md += `## Canalizaciones (Netlist)\n`;
  if (!project.conexiones || project.conexiones.length === 0) {
    md += `*No hay canalizaciones definidas.*\n`;
  } else {
    project.conexiones.forEach((c, i) => {
      const fromAmb = project.ambientes.find(a => a.id === c.from.ambienteId);
      const toAmb = project.ambientes.find(a => a.id === c.to.ambienteId);
      const fromEl = fromAmb?.elementos.find(e => e.id === c.from.elementoId);
      const toEl = toAmb?.elementos.find(e => e.id === c.to.elementoId);
      
      const circs = c.circuitosIds 
        ? c.circuitosIds.map(id => project.circuitos?.find(ci => ci.id === id)?.nombre).filter(Boolean).join(', ')
        : (c.circuitoId ? project.circuitos?.find(ci => ci.id === c.circuitoId)?.nombre : 'N/A');

      let len = 'Auto (No calculable)';
      if (c.origenLongitud === 'declarada' && c.seccionConduccion) {
         len = `${c.seccionConduccion}m (manual)`;
      } else {
         const auto = calcularLongitudOrtogonal(project, c.from.ambienteId, c.from.elementoId, c.to.ambienteId, c.to.elementoId);
         if (auto !== null) {
            len = `${auto.toFixed(2)}m (estimado)`;
         }
      }
      
      const tipoCond = c.tipoConducto || 'cano_rigido';
      
      md += `- **Cx ${i+1}**: De [${fromAmb?.nombre} - ${fromEl?.referencia||fromEl?.tipo}] a [${toAmb?.nombre} - ${toEl?.referencia||toEl?.tipo}]. Circuitos: ${circs || 'N/A'}.\n`;
      md += `  - **Canalización**: ${tipoCond} | ${c.conducto || 'Sin detalle'}\n`;
      md += `  - **Longitud**: ${len}\n`;
      if (c.descripcion) {
        md += `  - **Detalle**: ${c.descripcion}\n`;
      }
    });
  }

  downloadFile(md, `${project.nombre.replace(/ /g, '_')}_Informe.md`, 'text/markdown;charset=utf-8;');
}
