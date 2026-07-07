import React from 'react';

interface ProjectHeaderProps {
  /** Acción para disparar el flujo de importación */
  onImport: () => void;
  /** Acción para crear un nuevo proyecto */
  onCreate: () => void;
  /** Referencia al input de archivo oculto */
  fileRef: React.RefObject<HTMLInputElement | null>;
  /** Callback para cuando el archivo cambia */
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Encabezado de la pantalla de proyectos con acciones globales.
 */
export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ 
  onImport, 
  onCreate, 
  fileRef, 
  onFileChange 
}) => {
  return (
    <div className="screen-header">
      <span className="screen-title">Mis Proyectos</span>
      <div className="header-actions">
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={onImport}
        >
          ↑ Importar
        </button>
        <button 
          className="btn btn-acc btn-sm"
          onClick={onCreate}
        >
          + Nuevo Proyecto
        </button>
      </div>

      {/* Input oculto para la gestión de archivos (JSON) */}
      <input 
        ref={fileRef} 
        type="file" 
        accept=".json" 
        style={{ display: 'none' }} 
        onChange={onFileChange}
      />
    </div>
  );
};

