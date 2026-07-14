import type { Project, Ambiente } from '../types/index';
import type { MedicionCampania } from '../types/measurements';
import { calcularLongitudOrtogonal } from './electrical/calculations';
import { isBocaElectrica } from './circuitUtils';
import { getDefaultSymbolsSync } from './symbols';
import { RENDERER } from './renderer';

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
 * Exporta el SVG del ambiente seleccionado y lo descarga.
 */
export function exportEnvironmentToSVG(ambiente: Ambiente, project: Project) {
  try {
    const symbols = getDefaultSymbolsSync();
    // Render con exportMode=true para generar el SVG limpio imprimible
    const svgStr = RENDERER.render(ambiente, project, symbols, true, project);
    downloadFile(svgStr, `${project.nombre.replace(/ /g, '_')}_${ambiente.nombre.replace(/ /g, '_')}.svg`, 'image/svg+xml;charset=utf-8;');
  } catch (e) {
    console.error("Error al exportar SVG", e);
    alert("No se pudo exportar el SVG del ambiente.");
  }
}

/**
 * Algoritmo de ruteo/búsqueda de grafos para calcular el recorrido de un circuito y su longitud máxima.
 */
export function getCircuitPathsAndDetails(project: Project, circuitoId: string) {
  const cConex = (project.conexiones || []).filter(c => 
    c.circuitoId === circuitoId || c.circuitosIds?.includes(circuitoId)
  );

  const totalBocas = new Set<string>();
  cConex.forEach(c => {
    totalBocas.add(`${c.from.ambienteId}:${c.from.elementoId}`);
    totalBocas.add(`${c.to.ambienteId}:${c.to.elementoId}`);
  });

  const circuito = project.circuitos?.find(c => c.id === circuitoId);
  const tablero = project.tableros?.find(t => t.id === circuito?.tableroId);
  
  let rootKey = '';
  if (tablero && tablero.ambienteId && tablero.elementoId) {
    rootKey = `${tablero.ambienteId}:${tablero.elementoId}`;
  }

  // Construir lista de adyacencia
  const adj: Record<string, { to: { ambienteId: string, elementoId: string }, conexion: any, length: number }[]> = {};
  cConex.forEach(c => {
    const fromKey = `${c.from.ambienteId}:${c.from.elementoId}`;
    const toKey = `${c.to.ambienteId}:${c.to.elementoId}`;
    
    let length = 0;
    if (c.origenLongitud === 'declarada' && c.seccionConduccion) {
      length = c.seccionConduccion;
    } else {
      const auto = calcularLongitudOrtogonal(project, c.from.ambienteId, c.from.elementoId, c.to.ambienteId, c.to.elementoId);
      length = auto ?? 0;
    }

    if (!adj[fromKey]) adj[fromKey] = [];
    if (!adj[toKey]) adj[toKey] = [];
    
    adj[fromKey].push({ to: c.to, conexion: c, length });
    adj[toKey].push({ to: c.from, conexion: c, length });
  });

  // Si no tenemos la boca del tablero explícita, buscar algún elemento que sea Tablero
  if (!adj[rootKey]) {
    const keys = Object.keys(adj);
    if (keys.length > 0) {
      const tabKey = keys.find(k => {
        const [ambId, elId] = k.split(':');
        const amb = project.ambientes.find(a => a.id === ambId);
        const el = amb?.elementos.find(e => e.id === elId);
        return el?.tipo?.toLowerCase().includes('tablero') || el?.esTablero;
      });
      rootKey = tabKey || keys[0];
    }
  }

  if (!rootKey || !adj[rootKey]) {
    return {
      longitudMaxima: 0,
      bocasCount: totalBocas.size,
      recorrido: [],
      farthestNodeName: 'N/A'
    };
  }

  // BFS para encontrar el nodo más lejano
  const visited = new Set<string>();
  const queue: {
    key: string;
    distance: number;
    path: { nodeName: string, length: number, conducto: string, cables: string }[]
  }[] = [];

  const symbolsLib = getDefaultSymbolsSync();
  const getElDetails = (key: string) => {
    const [ambId, elId] = key.split(':');
    const amb = project.ambientes.find(a => a.id === ambId);
    const el = amb?.elementos.find(e => e.id === elId);
    if (!el) return key;
    
    const symLabel = symbolsLib.find((s: any) => s.id === el.tipo)?.label || el.tipo;
    const refStr = el.referencia ? ` [Ref: ${el.referencia}]` : '';
    const hStr = el.altura !== undefined ? ` (H: ${el.altura}m)` : '';
    return `${amb?.nombre} - ${symLabel}${refStr}${hStr}`;
  };

  queue.push({
    key: rootKey,
    distance: 0,
    path: [{ nodeName: getElDetails(rootKey), length: 0, conducto: '', cables: '' }]
  });
  visited.add(rootKey);

  let farthest = {
    key: rootKey,
    distance: 0,
    path: queue[0].path
  };

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.distance > farthest.distance) {
      farthest = curr;
    }

    const neighbors = adj[curr.key] || [];
    neighbors.forEach(n => {
      const nKey = `${n.to.ambienteId}:${n.to.elementoId}`;
      if (!visited.has(nKey)) {
        visited.add(nKey);
        
        const condType = n.conexion.tipoConducto || 'cano_rigido';
        const condName = `${condType} (${n.conexion.conducto || 'Sin detalle'})`;
        const cablesName = (n.conexion.cables || []).map((cb: any) => 
          `${cb.tipo} ${cb.seccion}mm² ${cb.color || ''}`
        ).join(', ');

        const step = {
          nodeName: getElDetails(nKey),
          length: n.length,
          conducto: condName,
          cables: cablesName
        };

        queue.push({
          key: nKey,
          distance: curr.distance + n.length,
          path: [...curr.path, step]
        });
      }
    });
  }

  return {
    longitudMaxima: farthest.distance,
    bocasCount: totalBocas.size,
    recorrido: farthest.path,
    farthestNodeName: getElDetails(farthest.key)
  };
}

/**
 * Calcula el cómputo total de materiales (conductos y cables) por circuito y globales.
 */
export function getMaterialConsumption(project: Project) {
  const conductos: Record<string, number> = {};
  const cables: Record<string, number> = {};

  const porCircuito: Record<string, {
    conductos: Record<string, number>,
    cables: Record<string, number>,
    nombre: string
  }> = {};

  (project.circuitos || []).forEach(circ => {
    porCircuito[circ.id] = {
      conductos: {},
      cables: {},
      nombre: circ.nombre
    };
  });

  porCircuito['sin_circuito'] = {
    conductos: {},
    cables: {},
    nombre: 'Sin Circuito Asignado'
  };

  (project.conexiones || []).forEach(c => {
    let length = 0;
    if (c.origenLongitud === 'declarada' && c.seccionConduccion) {
      length = c.seccionConduccion;
    } else {
      const auto = calcularLongitudOrtogonal(project, c.from.ambienteId, c.from.elementoId, c.to.ambienteId, c.to.elementoId);
      length = auto ?? 0;
    }

    if (length <= 0) return;

    const condType = c.tipoConducto || 'cano_rigido';
    const condName = c.conducto || 'Sin detalle';
    const condKey = `${condType} (${condName})`;

    conductos[condKey] = (conductos[condKey] || 0) + length;

    const cIds = c.circuitosIds && c.circuitosIds.length > 0
      ? c.circuitosIds
      : (c.circuitoId ? [c.circuitoId] : ['sin_circuito']);

    cIds.forEach(cId => {
      const circStore = porCircuito[cId] || porCircuito['sin_circuito'];
      circStore.conductos[condKey] = (circStore.conductos[condKey] || 0) + length;
    });

    (c.cables || []).forEach((cb: any) => {
      const cbKey = `${cb.seccion}mm² ${cb.tipo} (${cb.color || 'sin color'})`;
      cables[cbKey] = (cables[cbKey] || 0) + length;

      cIds.forEach(cId => {
        const circStore = porCircuito[cId] || porCircuito['sin_circuito'];
        circStore.cables[cbKey] = (circStore.cables[cbKey] || 0) + length;
      });
    });
  });

  return { conductos, cables, porCircuito };
}

/**
 * Calcula el desglose de componentes físicos y cajas del plano.
 */
export function getPhysicalComponentsCount(project: Project) {
  const symbolsLib = getDefaultSymbolsSync();
  
  const getDeviceDescription = (tipo: string) => {
    switch (tipo) {
      case 'tablero_principal': return 'Gabinete Embutir p/ Térmicas (Principal)';
      case 'tablero_seccional': return 'Gabinete Embutir p/ Térmicas (Seccional)';
      case 'boca_techo_iug': return 'Caja Octogonal de Techo (Chapa)';
      case 'boca_pared_brazo': return 'Caja Octogonal de Pared (Hierro)';
      case 'toma_tug_tue': return 'Caja Rectangular 4x2" + Bastidor + Módulos de Tomacorriente';
      case 'llave_1p': return 'Caja Rectangular 4x2" + Bastidor + Módulo Interruptor de 1 Punto';
      case 'llave_2p': return 'Caja Rectangular 4x2" + Bastidor + 2 Módulos Interruptor';
      case 'llave_3p': return 'Caja Rectangular 4x2" + Bastidor + 3 Módulos Interruptor';
      case 'llave_4p': return 'Caja Rectangular 4x2" + Bastidor + 4 Módulos Interruptor';
      case 'llave_comb': return 'Caja Rectangular 4x2" + Bastidor + Módulo Combinación';
      case 'caja_pase': return 'Caja Cuadrada de Pase 10x10 cm';
      default:
        const label = symbolsLib.find((s: any) => s.id === tipo)?.label || tipo;
        return `${label} (Caja Rectangular 4x2")`;
    }
  };

  const globales: Record<string, number> = {};
  const porCircuito: Record<string, Record<string, number>> = {};

  (project.circuitos || []).forEach(c => {
    porCircuito[c.id] = {};
  });
  porCircuito['sin_circuito'] = {};

  (project.ambientes || []).forEach(amb => {
    (amb.elementos || []).forEach(el => {
      const desc = getDeviceDescription(el.tipo);
      
      globales[desc] = (globales[desc] || 0) + 1;
      
      const cId = el.circuitoId || 'sin_circuito';
      const cStore = porCircuito[cId] || porCircuito['sin_circuito'];
      cStore[desc] = (cStore[desc] || 0) + 1;
    });
  });

  return { globales, porCircuito };
}

/**
 * Genera el informe Markdown del Proyecto y lo descarga.
 */
export function exportToMarkdown(project: Project) {
  let md = `# Informe de Relevamiento Eléctrico: ${project.nombre}\n\n`;
  md += `**Estado:** ${project.estado ?? 'Relevamiento'}\n`;
  md += `**Fecha:** ${new Date().toLocaleDateString()}\n\n`;

  md += `## 1. Resumen de Hojas (Ambientes)\n`;
  project.ambientes.forEach((a) => {
    const bocasCount = a.elementos.filter(el => isBocaElectrica(el, getDefaultSymbolsSync())).length;
    md += `- **${a.nombre}**: ${bocasCount} bocas, ${a.aberturas.length} aberturas.\n`;
  });
  md += '\n';

  md += `## 2. Informe de Circuitos Eléctricos\n`;
  if (!project.circuitos || project.circuitos.length === 0) {
    md += `*No hay circuitos definidos.*\n`;
  } else {
    md += `| Circuito | Tipo | Cant. Bocas | Long. Máx. hasta Boca Lejana | Boca más Lejana |\n`;
    md += `| --- | --- | --- | --- | --- |\n`;
    project.circuitos.forEach(c => {
      const details = getCircuitPathsAndDetails(project, c.id);
      md += `| **${c.nombre}** | ${c.tipo} | ${details.bocasCount} | ${details.longitudMaxima.toFixed(2)} m | ${details.farthestNodeName} |\n`;
    });
  }
  md += '\n';

  md += `## 3. Recorrido de Circuitos (Netlist de Recorrido)\n`;
  if (!project.circuitos || project.circuitos.length === 0) {
    md += `*No hay circuitos definidos.*\n`;
  } else {
    project.circuitos.forEach(c => {
      const details = getCircuitPathsAndDetails(project, c.id);
      md += `### Circuito: ${c.nombre} (${c.tipo})\n`;
      if (details.recorrido.length <= 1) {
        md += `*No hay conexiones cargadas o trazadas para este circuito.*\n\n`;
      } else {
        md += `**Recorrido hasta la boca más lejana:**\n`;
        details.recorrido.forEach((step, idx) => {
          if (idx === 0) {
            md += `- **Origen (Tablero):** ${step.nodeName}\n`;
          } else {
            md += `- Paso ${idx}: Conecta a **${step.nodeName}** via *${step.conducto}* con cables [${step.cables}] (${step.length.toFixed(2)} m)\n`;
          }
        });
        md += `\n**Longitud Máxima Acumulada:** ${details.longitudMaxima.toFixed(2)} m.\n\n`;
      }
    });
  }
  md += '\n';

  md += `## 4. Cómputo y Consumo de Materiales\n`;
  const materials = getMaterialConsumption(project);
  const physical = getPhysicalComponentsCount(project);
  
  md += `### 4.1. Desglose por Circuito\n`;
  Object.keys(materials.porCircuito).forEach(cId => {
    const m = materials.porCircuito[cId];
    const phys = physical.porCircuito[cId] || {};
    if (Object.keys(m.conductos).length === 0 && Object.keys(m.cables).length === 0 && Object.keys(phys).length === 0) return;
    
    md += `#### Circuito: ${m.nombre}\n`;
    
    if (Object.keys(m.conductos).length > 0) {
      md += `**Cañerías y Acoplamientos:**\n`;
      Object.keys(m.conductos).forEach(cond => {
        md += `- ${cond}: **${m.conductos[cond].toFixed(2)} m**\n`;
      });
    }
    
    if (Object.keys(m.cables).length > 0) {
      md += `**Conductores:**\n`;
      Object.keys(m.cables).forEach(cab => {
        md += `- ${cab}: **${m.cables[cab].toFixed(2)} m**\n`;
      });
    }

    if (Object.keys(phys).length > 0) {
      md += `**Cajas, Gabinetes y Módulos:**\n`;
      Object.keys(phys).forEach(pKey => {
        md += `- ${pKey}: **${phys[pKey]} un**\n`;
      });
    }
    md += '\n';
  });

  md += `### 4.2. Totales Generales del Proyecto\n`;
  md += `#### Cañerías Totales:\n`;
  if (Object.keys(materials.conductos).length === 0) {
    md += `*No hay cañerías registradas.*\n`;
  } else {
    Object.keys(materials.conductos).forEach(cond => {
      md += `- ${cond}: **${materials.conductos[cond].toFixed(2)} m**\n`;
    });
  }
  md += '\n';

  md += `#### Cables Totales:\n`;
  if (Object.keys(materials.cables).length === 0) {
    md += `*No hay cables registrados.*\n`;
  } else {
    Object.keys(materials.cables).forEach(cab => {
      md += `- ${cab}: **${materials.cables[cab].toFixed(2)} m**\n`;
    });
  }
  md += '\n';

  md += `#### Cajas y Dispositivos Totales:\n`;
  if (Object.keys(physical.globales).length === 0) {
    md += `*No hay cajas ni tableros registrados.*\n`;
  } else {
    Object.keys(physical.globales).forEach(pKey => {
      md += `- ${pKey}: **${physical.globales[pKey]} un**\n`;
    });
  }
  md += '\n';

  downloadFile(md, `${project.nombre.replace(/ /g, '_')}_Informe.md`, 'text/markdown;charset=utf-8;');
}

/**
 * Exporta el cómputo de materiales detallado a un archivo CSV estructurado.
 */
export function exportMaterialsToCSV(project: Project) {
  const materials = getMaterialConsumption(project);
  const physical = getPhysicalComponentsCount(project);
  const rows: any[] = [];

  Object.keys(materials.porCircuito).forEach(cId => {
    const m = materials.porCircuito[cId];
    
    // Cañerías
    Object.keys(m.conductos).forEach(cond => {
      rows.push({
        Circuito: m.nombre,
        Categoria: 'Cañerías / Conductos',
        Detalle: cond,
        Cantidad: m.conductos[cond].toFixed(2),
        Unidad: 'm'
      });
    });
    
    // Cables
    Object.keys(m.cables).forEach(cab => {
      rows.push({
        Circuito: m.nombre,
        Categoria: 'Conductores / Cables',
        Detalle: cab,
        Cantidad: m.cables[cab].toFixed(2),
        Unidad: 'm'
      });
    });

    // Cajas / Módulos
    const phys = physical.porCircuito[cId] || {};
    Object.keys(phys).forEach(pKey => {
      rows.push({
        Circuito: m.nombre,
        Categoria: 'Cajas y Dispositivos',
        Detalle: pKey,
        Cantidad: phys[pKey],
        Unidad: 'un'
      });
    });
  });

  exportToCSV(rows, `${project.nombre.replace(/ /g, '_')}_Materiales.csv`);
}

/**
 * Helper para exportar toda la información del proyecto a la vez.
 */
export function exportAllProjectData(project: Project) {
  // 1. Markdown
  exportToMarkdown(project);

  // 2. CSV Bocas
  const dataBocas = project.ambientes.flatMap(a => 
    a.elementos.map(el => {
      const circ = project.circuitos?.find(c => c.id === el.circuitoId);
      const circName = circ ? circ.nombre : 'N/A';
      return {
        Hoja: a.nombre,
        Referencia: el.referencia || 'S/R',
        Tipo: el.tipo,
        Altura: el.altura || 0,
        Circuito: circName
      };
    })
  );
  exportToCSV(dataBocas, `${project.nombre.replace(/ /g, '_')}_Bocas.csv`);

  // 3. CSV Circuitos
  const dataCirc = (project.circuitos || []).map(c => {
    const details = getCircuitPathsAndDetails(project, c.id);
    return {
      Nombre: c.nombre,
      Tipo: c.tipo,
      Bocas: details.bocasCount,
      LongitudMax_m: details.longitudMaxima.toFixed(2),
      BocaMasLejana: details.farthestNodeName
    };
  });
  exportToCSV(dataCirc, `${project.nombre.replace(/ /g, '_')}_Circuitos.csv`);

  // 4. CSV Materiales
  exportMaterialsToCSV(project);

  // 5. Mediciones
  if (project.campanias && project.campanias.length > 0) {
    project.campanias.forEach(c => {
      exportCampaniaReport(project, c.id);
      exportCampaniaToCSV(project, c.id);
    });
  }

  // 6. SVG para todos los ambientes
  project.ambientes.forEach(amb => {
    exportEnvironmentToSVG(amb, project);
  });
}

// ─── EXPORTACIONES DE MEDICIONES ───

function getElementLabelForExport(m: MedicionCampania, project: Project): string {
  const ref = m.elementoRef
  if (ref.tipo === 'boca' || ref.tipo === 'tablero') {
    const amb = project.ambientes.find(a => a.id === ref.ambienteId)
    const el  = amb?.elementos.find(e => e.id === ref.elementoId)
    if (el) return `${amb?.nombre ?? '?'} › ${el.referencia || el.tipo}`
    return `${amb?.nombre ?? '?'} › (elemento)`
  }
  if (ref.tipo === 'tierra')      return `Tierra: ${ref.descripcion}`
  if (ref.tipo === 'circuito')    return `Circuito: ${ref.circuitoId}`
  if (ref.tipo === 'diferencial') return `Diferencial (tablero: ${ref.tableroId})`
  return '(elemento)'
}

export function exportCampaniaReport(project: Project, campaniaId: string) {
  const c = project.campanias?.find(x => x.id === campaniaId)
  if (!c) {
    alert("Campaña no encontrada.")
    return
  }
  const mediciones = (project.medicionesCampania || []).filter(m => m.campaniaId === campaniaId)
  
  let md = `# Reporte de Medición: ${c.nombre}\n\n`
  md += `**Tipo/Norma:** ${c.tipoMedicion || '-'}\n`
  md += `**Instrumento:** ${c.instrumento} ${c.instrumentoSerie ? `(S/N: ${c.instrumentoSerie})` : ''}\n`
  md += `**Fecha Inicio:** ${new Date(c.fechaInicio).toLocaleString()}\n`
  if (c.fechaFin) md += `**Fecha Fin:** ${new Date(c.fechaFin).toLocaleString()}\n`
  md += `**Técnicos:** ${c.tecnicos.join(', ') || '-'}\n`
  if (c.notas) md += `**Notas:** ${c.notas}\n`
  md += `\n## Resumen\n`
  const aprob = mediciones.filter(m => m.aprobado === true).length
  const nAprob = mediciones.filter(m => m.aprobado === false).length
  md += `- Total Mediciones: ${mediciones.length}\n`
  md += `- Aprobadas: ${aprob}\n`
  md += `- No Aprobadas: ${nAprob}\n\n`

  md += `## Detalles de Mediciones\n\n`
  if (mediciones.length === 0) {
    md += `*Sin mediciones registradas.*\n`
  } else {
    mediciones.forEach(m => {
      md += `### ${getElementLabelForExport(m, project)}\n`
      md += `- **Fecha:** ${new Date(m.fechaHora).toLocaleString()}\n`
      md += `- **Resultado:** ${m.aprobado === true ? '✅ Aprobado' : m.aprobado === false ? '❌ No Aprobado' : '➖ Sin evaluar'}\n`
      if (m.notas) md += `- **Notas:** ${m.notas}\n`
      md += `- **Lecturas:**\n`
      m.lecturas.forEach(l => {
        const estado = l.aprobado === true ? '✅' : l.aprobado === false ? '❌' : ''
        md += `  - ${l.etiqueta ? `${l.etiqueta}: ` : ''}${l.valor} ${l.unidad ?? c.unidad} ${estado}\n`
      })
      md += `\n`
    })
  }

  const filename = `Reporte_${c.nombre.replace(/ /g, '_')}.md`
  downloadFile(md, filename, 'text/markdown;charset=utf-8;')
}

export function exportCampaniaToCSV(project: Project, campaniaId: string) {
  const c = project.campanias?.find(x => x.id === campaniaId)
  if (!c) {
    alert("Campaña no encontrada.")
    return
  }
  const mediciones = (project.medicionesCampania || []).filter(m => m.campaniaId === campaniaId)
  
  const data: Record<string, any>[] = []
  mediciones.forEach(m => {
    const elLabel = getElementLabelForExport(m, project)
    const fecha = new Date(m.fechaHora).toLocaleString()
    const globalRes = m.aprobado === true ? 'Aprobado' : m.aprobado === false ? 'No Aprobado' : 'N/A'
    
    m.lecturas.forEach((l, idx) => {
      data.push({
        'Campaña': c.nombre,
        'Elemento': elLabel,
        'Fecha/Hora': fecha,
        'Lectura Etiqueta': l.etiqueta || `Lectura ${idx+1}`,
        'Valor': l.valor,
        'Unidad': l.unidad ?? c.unidad,
        'Evaluación Lectura': l.aprobado === true ? 'OK' : l.aprobado === false ? 'NOK' : 'N/A',
        'Resultado Global': globalRes,
        'Notas': m.notas || ''
      })
    })
  })

  exportToCSV(data, `Mediciones_${c.nombre.replace(/ /g, '_')}.csv`)
}
