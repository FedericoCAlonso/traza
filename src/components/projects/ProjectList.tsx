import React from 'react';
import { ProjectItem } from './ProjectItem';
import { type Project } from '../../types/index';

interface ProjectListProps {
  /** Lista completa de proyectos */
  projects: Project[];
  /** ID del proyecto activo */
  activeId: string | null;
  /** Callback para seleccionar un proyecto */
  onSelect: (id: string) => void;
  /** Callback para eliminar un proyecto */
  onDelete: (id: string) => void;
  /** Callback para configurar un proyecto */
  onConfig: (id: string) => void;
}

/**
 * Contenedor de la lista de proyectos. Maneja el estado vacío.
 */
export const ProjectList: React.FC<ProjectListProps> = ({ 
  projects, 
  activeId, 
  onSelect, 
  onDelete,
  onConfig
}) => {
  if (projects.length === 0) {
    return (
      <div className="project-list">
        <div className="empty">
          Sin proyectos guardados.<br/>
          Comenzá creando uno nuevo o importando un backup.
        </div>
      </div>
    );
  }

  return (
    <div className="project-list">
      {projects.map((p) => (
        <ProjectItem 
          key={p.id} 
          project={p} 
          isActive={p.id === activeId} 
          onSelect={onSelect} 
          onDelete={onDelete} 
          onConfig={onConfig}
        />
      ))}
    </div>
  );
};
