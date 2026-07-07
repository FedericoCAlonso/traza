import React from 'react';

interface EditorLayoutProps {
  /** Barra superior de selección de hojas/ambientes */
  sheetBar: React.ReactNode;
  /** Barra de navegación entre pestañas (Paredes, Bocas, etc) */
  tabBar: React.ReactNode;
  /** Contenido principal del feed */
  children: React.ReactNode;
  /** Botones de acción fijos al pie del feed */
  footer?: React.ReactNode;
}

/**
 * Componente de Layout que define la estructura visual del editor.
 * Facilita la composición de la UI mediante slots.
 */
export const EditorLayout: React.FC<EditorLayoutProps> = ({ 
  sheetBar, 
  tabBar, 
  children, 
  footer 
}) => {
  return (
    <>
      {sheetBar}
      {tabBar}
      <div className="panel-feed">
        <div className="panel-feed-inner">
          {children}
        </div>
        {footer && (
          <div className="add-row">
            {footer}
          </div>
        )}
      </div>
    </>
  );
};
