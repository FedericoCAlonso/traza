import React from 'react';
import { type Project } from '../../types/index';

interface ProjectItemProps {
  /** Datos del proyecto a renderizar */
  project: Project;
  /** Indica si este proyecto es el seleccionado actualmente */
  isActive: boolean;
  /** Callback para seleccionar el proyecto */
  onSelect: (id: string) => void;
  /** Callback para eliminar el proyecto */
  onDelete: (id: string) => void;
  /** Callback para configurar el proyecto */
  onConfig: (id: string) => void;
}

/**
 * Representación visual de un proyecto individual en la lista.
 */
export const ProjectItem: React.FC<ProjectItemProps> = React.memo(({ 
  project, 
  isActive, 
  onSelect, 
  onDelete,
  onConfig
}) => {
  return (
    <div 
      className={`project-item ${isActive ? 'active' : ''}`} 
      onClick={() => onSelect(project.id)}
    >
      <div className="project-info" style={{ flex: 1 }}>
        <div className="project-name">
          {project.nombre || 'Proyecto sin nombre'}
        </div>
        <div className="project-meta">
          Escala 1:{project.escala} · {project.ambientes.length} hoja(s) de relevamiento
        </div>
        <div className="project-ambientes-tags">
          {project.ambientes.map(a => a.nombre).join(' · ')}
        </div>
      </div>

      <div className="project-item__actions" style={{ display: 'flex', gap: '0.5rem' }}>
        <button 
          className="btn btn-ghost btn-sm" 
          title="Configurar proyecto"
          onClick={(e) => {
            e.stopPropagation();
            onConfig(project.id);
          }}
        >
          ⚙️
        </button>
        <button 
          className="btn btn-danger btn-sm" 
          title="Eliminar proyecto"
          onClick={(e) => {
            e.stopPropagation(); // Evitamos que se dispare el onSelect al borrar
            if (window.confirm(`¿Eliminar "${project.nombre}"?`)) {
              onDelete(project.id);
            }
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
});
