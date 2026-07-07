import React from 'react';
import { Card } from '../../../../ui/Card';
import { F } from '../../../../ui/Field';
import { NumInput } from '../../../../ui/NumInput';
import { type Project } from '../../../../types/index';

interface GeneralTabProps {
  project: Project;
  onUpdateProject: (fn: (p: Project) => Project) => void;
}

/**
 * Pestaña general del proyecto: metadatos, escala y configuración global.
 */
export const GeneralTab: React.FC<GeneralTabProps> = React.memo(({
  project,
  onUpdateProject,
}) => {
  return (
    <>
      <Card idx="📋" title="Datos del Proyecto" defaultOpen={true}>
        <F label="Nombre del proyecto">
          <input
            value={project.nombre}
            onChange={e => onUpdateProject(p => ({ 
              ...p, 
              nombre: e.target.value
            }))}
          />
        </F>
        <F label="Estado">
          <select
            value={project.estado || 'relevamiento'}
            onChange={e => onUpdateProject(p => ({ ...p, estado: e.target.value as Project['estado'] }))}
          >
            <option value="relevamiento">Relevamiento</option>
            <option value="presupuesto">Presupuesto</option>
            <option value="en_ejecucion">En ejecución</option>
            <option value="ejecutado">Ejecutado</option>
            <option value="certificado">Certificado</option>
          </select>
        </F>
        <F label="Sistema de distribución">
          <select
            value={project.sistemaDistribucion || 'TT'}
            onChange={e => onUpdateProject(p => ({ ...p, sistemaDistribucion: e.target.value as Project['sistemaDistribucion'] }))}
          >
            <option value="TT">TT</option>
            <option value="IT">IT</option>
            <option value="TN-S">TN-S</option>
            <option value="TN-C">TN-C</option>
            <option value="TN-C-S">TN-C-S</option>
          </select>
        </F>
      </Card>

      <Card idx="⚙️" title="Configuración por Defecto" defaultOpen={true}>
        <div className="field-row">
          <F label="Escala de dibujo">
            <NumInput
              value={project.escala}
              onChange={(v: any) => onUpdateProject(p => ({ ...p, escala: v }))}
            />
          </F>
          <F label="Grosor pared default (m)">
            <NumInput
              value={project.grosor_pared_default}
              onChange={(v: any) => onUpdateProject(p => ({ ...p, grosor_pared_default: v }))}
            />
          </F>
          <F label="Altura de techo default (m)">
            <NumInput
              value={project.alturaDefault ?? 2.6}
              onChange={(v: any) => onUpdateProject(p => ({ ...p, alturaDefault: v }))}
            />
          </F>
        </div>
      </Card>
    </>
  );
});
