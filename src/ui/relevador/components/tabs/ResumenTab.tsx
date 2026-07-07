import { Card } from '../../../../ui/Card';
import { F } from '../../../../ui/Field';
import type { Project, Ambiente } from '../../../../types/index';
import { exportAllProjectData } from '../../../../lib/exporters';
import { isBocaElectrica } from '../../../../lib/circuitUtils';
import { useSymbols } from '../../../../core/SymbolsContext';
import { RENDERER } from '../../../../lib/renderer';

interface ResumenTabProps {
  project: Project;
  activeAmbiente: Ambiente;
}

interface StatCardProps {
  icon: string;
  value: number | string;
  label: string;
  accent?: boolean;
}

function StatCard({ icon, value, label, accent }: StatCardProps) {
  return (
    <div
      className="card"
      style={{
        padding: '14px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderLeft: accent ? '3px solid var(--acc)' : undefined,
      }}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      <div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--text-h)' }}>
          {value}
        </div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

export function ResumenTab({ project, activeAmbiente }: ResumenTabProps) {
  const { symbolsLib } = useSymbols();
  
  // Métricas globales del proyecto
  const totalHojas = project.ambientes?.length ?? 0;
  const totalElecs = project.ambientes?.reduce((sum: number, a: Ambiente) => sum + (a.elementos?.filter(el => isBocaElectrica(el, symbolsLib)).length ?? 0), 0) ?? 0;
  const totalAberturas = project.ambientes?.reduce((sum: number, a: Ambiente) => sum + (a.aberturas?.length ?? 0), 0) ?? 0;
  const totalCircuitos = project.circuitos?.length ?? 0;
  const totalConexiones = project.conexiones?.length ?? 0;

  // Métricas de la hoja activa
  const paredCount = activeAmbiente.paredes?.length ?? 0;
  
  let areaPisoM2 = 0;
  let areaParedesM2 = 0;
  
  try {
    const { allSegs } = RENDERER.buildSegs(activeAmbiente, project);

    // Calcular área del piso (fórmula del polígono de Shoelace)
    if (allSegs.length > 2) {
      const pts = allSegs.map(s => s.inicio);
      let areaPx = 0;
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % pts.length];
        areaPx += (p1[0] * p2[1]) - (p2[0] * p1[1]);
      }
      const areaPx2 = Math.abs(areaPx) / 2;
      areaPisoM2 = areaPx2 * Math.pow((project.escala || 50) / 1000, 2);
    }

    // Calcular área de paredes (largo * altura)
    let totalParedM = 0;
    allSegs.forEach(s => {
      totalParedM += Math.hypot(s.fin[0] - s.inicio[0], s.fin[1] - s.inicio[1]) * ((project.escala || 50) / 1000);
    });
    
    const altura = activeAmbiente.alturaLocal || project.alturaDefault || 2.6;
    let areaAberturas = 0;
    (activeAmbiente.aberturas || []).forEach(ab => {
      const h = ab.tipo === 'puerta' ? 2.05 : 1.2;
      areaAberturas += ab.ancho * h;
    });
    
    areaParedesM2 = Math.max(0, (totalParedM * altura) - areaAberturas);
  } catch (e) {
    console.error("Error calculando areas", e);
  }

  const elecCount = activeAmbiente.elementos?.filter(el => isBocaElectrica(el, symbolsLib)).length ?? 0;
  const abertCount = activeAmbiente.aberturas?.length ?? 0;

  const estadoLabels: Record<NonNullable<Project['estado']>, string> = {
    relevamiento: 'Relevamiento',
    presupuesto: 'Presupuesto',
    en_ejecucion: 'En ejecución',
    ejecutado: 'Ejecutado',
    certificado: 'Certificado',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="info-helper">
        Vista resumen del proyecto y la hoja activa.
      </div>

      {/* Proyecto */}
      <Card
        idx="📊"
        title={project.nombre}
        badge={estadoLabels[project.estado ?? 'relevamiento']}
        defaultOpen
      >
        <div className="field-row">
          <F label="Hojas">
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-h)' }}>{totalHojas}</div>
          </F>
          <F label="Circuitos">
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-h)' }}>{totalCircuitos}</div>
          </F>
          <F label="Conexiones">
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-h)' }}>{totalConexiones}</div>
          </F>
        </div>
      </Card>

      {/* Stats globales */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
        }}
      >
        <StatCard icon="⚡" value={totalElecs} label="Bocas totales" accent />
        <StatCard icon="🚪" value={totalAberturas} label="Aberturas totales" />
      </div>

      {/* Hoja activa */}
      <Card
        idx="🏠"
        title={activeAmbiente.nombre}
        badge={activeAmbiente.tipoAmbiente && activeAmbiente.tipoAmbiente !== 'interior'
          ? activeAmbiente.tipoAmbiente === 'exterior' ? 'Exterior' : 'Semi'
          : 'Interior'}
        defaultOpen
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
          }}
        >
          <StatCard icon="🧱" value={paredCount} label="Paredes" />
          <StatCard icon="📏" value={`${areaPisoM2.toFixed(1)} m²`} label="Sup. Piso" />
          <StatCard icon="🏢" value={`${areaParedesM2.toFixed(1)} m²`} label="Sup. Paredes" />
          <StatCard icon="⚡" value={elecCount} label="Bocas" accent />
          <StatCard icon="🚪" value={abertCount} label="Aberturas" />
        </div>
      </Card>

      {/* Exportaciones */}
      <Card
        idx="💾"
        title="Exportación de Datos"
        defaultOpen
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button 
            className="btn btn-acc" 
            onClick={() => exportAllProjectData(project)}
          >
            📦 Descargar Paquete de Reportes Completos (CSV + MD)
          </button>
        </div>
      </Card>
    </div>
  );
}
