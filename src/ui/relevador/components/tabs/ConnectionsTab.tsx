import React from 'react';
import { ConexionCard } from '../ConexionCard';
import { type Project, type Circuito, type Conexion } from '../../../../types/index';

interface ConnectionsTabProps {
  project: Project;
  circuitos: Circuito[];
  conexiones: Conexion[];
  updateConexiones: (fn: (conexiones: Conexion[]) => Conexion[]) => void;
}

/**
 * Pestaña para la gestión del netlist y canalizaciones inter-boca.
 */
export const ConnectionsTab: React.FC<ConnectionsTabProps> = React.memo(({ 
  project, 
  circuitos, 
  conexiones, 
  updateConexiones 
}) => {
  return (
    <>
      <div className="info-helper">
        🔗 Creá canalizaciones vinculando bocas entre sí. Estas líneas punteadas se verán en el plano.
      </div>
      {conexiones.map((c, i) => (
        <ConexionCard
          key={c.id}
          conexion={c}
          index={i}
          project={project}
          circuitos={circuitos}
          onChange={(nc: any) => updateConexiones(ps => ps.map(x => x.id === nc.id ? nc : x))}
          onRemove={() => updateConexiones(ps => ps.filter(x => x.id !== c.id))}
        />
      ))}
      <button 
        className="btn btn-acc" 
        style={{ width: '100%', marginTop: '16px' }}
        onClick={() => {
          if (project.ambientes.length === 0 || project.ambientes[0].elementos.length === 0) {
            alert("Necesitás al menos un ambiente con bocas para crear conexiones.");
            return;
          }
          const firstAmb = project.ambientes[0];
          const firstEl = firstAmb.elementos[0];
          updateConexiones(ps => [...ps, {
            id: Date.now().toString(),
            from: { ambienteId: firstAmb.id, elementoId: firstEl.id },
            to: { ambienteId: firstAmb.id, elementoId: firstEl.id },
            cables: [
              { tipo: 'fase', seccion: 2.5, color: 'negro' },
              { tipo: 'neutro', seccion: 2.5, color: 'celeste' },
              { tipo: 'pe', seccion: 2.5, color: 'verde-amarillo' },
            ],
            conducto: 'PVC 20mm'
          }]);
        }}
      >
        + Nueva Canalización
      </button>
      {conexiones.length === 0 && (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
          No hay canalizaciones cargadas. Agregá una para vincular las bocas con cañerías.
        </div>
      )}
    </>
  );
});
