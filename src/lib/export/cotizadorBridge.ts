import type { Project } from '../../types/project';
import type { Cliente, ObraCliente } from '../../types/client';
import { gdriveProvider } from '../../services/GoogleDriveProvider';
import { syncEngine } from '../../services/syncEngine';

export interface ComputoBocasTraza {
  bocasIluminacion: number;
  tomasSimples: number;
  tomasDobles: number;
  tomasEspeciales: number;
  interruptores: number;
  tableros: number;
  circuitos: number;
  jabalinasPat: number;
  metrosCaneriaEstimados: number;
  metrosConductoresEstimados: number;
  resumenTexto: string;
}

/**
 * Calcula las cantidades y métricas de una instalación a partir del modelo de Traza.
 */
export function calcularComputoTraza(project: Project): ComputoBocasTraza {
  let bocasIluminacion = 0;
  let tomasSimples = 0;
  let tomasDobles = 0;
  let tomasEspeciales = 0;
  let interruptores = 0;
  let jabalinasPat = 0;
  let totalPerimetroM = 0;

  (project.ambientes || []).forEach(amb => {
    // Calcular perímetro de paredes para estimación de canalizaciones
    (amb.paredes || []).forEach(p => {
      totalPerimetroM += Number(p.largo) || 0;
    });

    (amb.elementos || []).forEach(el => {
      const type = el.tipo?.toLowerCase() || '';
      if (type.includes('techo') || type.includes('ilum') || type.includes('aplique') || type.includes('centro') || type.includes('boca')) {
        bocasIluminacion++;
      } else if (type.includes('doble') || type.includes('2t')) {
        tomasDobles++;
      } else if (type.includes('toma') || type.includes('tug')) {
        tomasSimples++;
      } else if (type.includes('tue') || type.includes('especial') || type.includes('fuerza') || type.includes('aire')) {
        tomasEspeciales++;
      } else if (type.includes('llave') || type.includes('punto') || type.includes('interruptor') || type.includes('comb')) {
        interruptores++;
      } else if (type.includes('pat') || type.includes('jabalina') || type.includes('tierra')) {
        jabalinasPat++;
      }
    });
  });

  const tableros = (project.tableros?.length || 0) > 0 ? project.tableros.length : 1;
  const circuitos = project.circuitos?.length || Math.max(1, Math.ceil((bocasIluminacion + tomasDobles + tomasSimples) / 12));

  // Estimación de metros de canalización: ~3.5m por boca + perímetro básico
  const totalBocas = bocasIluminacion + tomasSimples + tomasDobles + tomasEspeciales + interruptores;
  const metrosCaneriaEstimados = Math.round(totalBocas * 3.8 + (totalPerimetroM > 0 ? totalPerimetroM * 0.4 : 15));
  // Estimación de conductores: cañería * promedio 3 cables (F+N+PE) + 15% desperdicio y bajadas
  const metrosConductoresEstimados = Math.round(metrosCaneriaEstimados * 3.2);

  const resumen = [
    `${bocasIluminacion} Bocas de Iluminación`,
    `${tomasDobles + tomasSimples + tomasEspeciales} Tomacorrientes (${tomasDobles} dobles)`,
    `${interruptores} Llaves de encendido`,
    `${tableros} Tablero(s) (${circuitos} circuitos)`,
    jabalinasPat > 0 ? `${jabalinasPat} Puesta(s) a Tierra` : '',
    `~${metrosCaneriaEstimados}m Cañería estimada / ~${metrosConductoresEstimados}m Conductores`
  ].filter(Boolean).join(' · ');

  return {
    bocasIluminacion,
    tomasSimples,
    tomasDobles,
    tomasEspeciales,
    interruptores,
    tableros,
    circuitos,
    jabalinasPat,
    metrosCaneriaEstimados,
    metrosConductoresEstimados,
    resumenTexto: resumen
  };
}

/**
 * Empaqueta y envía el cómputo del proyecto al archivo maestro de Google Drive / Cotizador.
 */
export async function enviarAlCotizador(
  project: Project,
  cliente?: Cliente,
  obra?: ObraCliente
): Promise<{ success: boolean; urlCotizador: string; message: string }> {
  const computo = calcularComputoTraza(project);

  const cotizacionDraft = {
    id: `cot_traza_${project.id}`,
    proyectoTrazaId: project.id,
    clienteId: cliente?.id || project.clienteId,
    obraId: obra?.id || project.obraId,
    titulo: `Presupuesto: ${project.nombre}`,
    fechaCreacion: new Date().toISOString(),
    itemsSugeridos: [
      {
        tipo: 'tareaTipo',
        nombre: 'Boca de iluminación completa (provisión y colocación)',
        cantidad: computo.bocasIluminacion,
        categoria: 'Iluminación'
      },
      {
        tipo: 'tareaTipo',
        nombre: 'Boca de tomacorriente doble completo',
        cantidad: computo.tomasDobles,
        categoria: 'Tomacorrientes'
      },
      {
        tipo: 'tareaTipo',
        nombre: 'Boca de tomacorriente simple / uso general',
        cantidad: computo.tomasSimples,
        categoria: 'Tomacorrientes'
      },
      {
        tipo: 'tareaTipo',
        nombre: 'Boca de tomacorriente especial (TUE / Aire / Fuerza)',
        cantidad: computo.tomasEspeciales,
        categoria: 'Fuerza Motriz / Especial'
      },
      {
        tipo: 'tareaTipo',
        nombre: 'Armado e instalación de Tablero Seccional',
        cantidad: computo.tableros,
        circuitos: computo.circuitos,
        categoria: 'Tableros'
      },
      {
        tipo: 'tareaTipo',
        nombre: 'Hincado de Jabalina y Medición de PAT',
        cantidad: Math.max(1, computo.jabalinasPat),
        categoria: 'Puesta a Tierra'
      }
    ].filter(item => item.cantidad > 0)
  };

  // Guardar en el archivo maestro de Google Drive si está configurado
  try {
    const payload = syncEngine.getLocalPayload();
    if (!payload.solicitudesPresupuesto) {
      payload.solicitudesPresupuesto = [];
    }
    payload.solicitudesPresupuesto = [
      ...payload.solicitudesPresupuesto.filter((s: any) => s.id !== cotizacionDraft.id),
      cotizacionDraft
    ];

    if (gdriveProvider.getAccessToken()) {
      await gdriveProvider.writeMasterPayload(payload);
    }
  } catch (e) {
    console.warn('[cotizadorBridge] No se pudo guardar en Google Drive inmediatamente:', e);
  }

  // URL para abrir el cotizador con parámetros (si corre en localhost o producción)
  const cotizadorBaseUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:5173' 
    : 'https://cotizador.ieba.com.ar'; // Reemplazable con la URL del cotizador

  const params = new URLSearchParams({
    importFromTraza: 'true',
    projectId: project.id,
    clienteId: cliente?.id || project.clienteId || '',
    obraId: obra?.id || project.obraId || '',
    titulo: project.nombre
  });

  return {
    success: true,
    urlCotizador: `${cotizadorBaseUrl}?${params.toString()}`,
    message: `Se generó el paquete de cotización con ${computo.resumenTexto}.`
  };
}
