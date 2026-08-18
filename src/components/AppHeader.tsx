import React from 'react';
import type { Project } from '../types/index';
import { RotateCcw, Download, X, ChevronRight, Sun, Moon, Monitor, Settings } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface AppHeaderProps {
  screen: 'projects' | 'editor';
  activeProject: Project | null;
  activeAmbienteName?: string;
  canUndo: boolean;
  modeSelector?: React.ReactNode;
  onGoHome: () => void;
  onUndo: () => void;
  onShowExport: () => void;
  onOpenConfig?: () => void;
}

export function AppHeader({
  screen,
  activeProject,
  activeAmbienteName,
  canUndo,
  modeSelector,
  onGoHome,
  onUndo,
  onShowExport,
  onOpenConfig
}: AppHeaderProps) {
  const { themeMode, toggleTheme } = useTheme();

  return (
    <header className="topbar">
      <span className="topbar-logo" onClick={onGoHome} title="Ir al Dashboard">
        Traza
      </span>

      {screen === 'editor' && activeProject && (
        <span className="topbar-crumb">
          <ChevronRight size={14} style={{ opacity: 0.6 }} />
          <span>{activeProject.nombre || 'Proyecto'}</span>
          {activeAmbienteName && (
            <span style={{ opacity: 0.7 }}> / {activeAmbienteName}</span>
          )}
        </span>
      )}

      {modeSelector && (
        <span className="topbar-mode-container" style={{ display: 'flex', alignItems: 'center', marginLeft: '12px' }}>
          {modeSelector}
        </span>
      )}

      <span className="topbar-sep" />

      <div className="topbar-actions">
        {onOpenConfig && (
          <button
            className="btn-topbar"
            onClick={onOpenConfig}
            title="Configuración general (Perfil, Drive, Tema)"
          >
            <Settings size={18} />
          </button>
        )}

        <button
          className="btn-topbar"
          onClick={toggleTheme}
          title={`Tema actual: ${themeMode === 'system' ? 'Sistema' : themeMode === 'dark' ? 'Oscuro' : 'Claro'} (Clic para cambiar)`}
        >
          {themeMode === 'system' && <Monitor size={18} />}
          {themeMode === 'dark' && <Moon size={18} />}
          {themeMode === 'light' && <Sun size={18} />}
        </button>

        {screen === 'editor' && (
          <>
            <button 
              className={`btn-topbar ${!canUndo ? 'disabled' : ''}`} 
              onClick={onUndo} 
              disabled={!canUndo} 
              title="Deshacer (Undo)"
            >
              <RotateCcw size={18} />
            </button>
            
            <button className="btn btn-acc btn-sm" onClick={onShowExport} title="Exportar planos e informes">
              <Download size={16} />
              <span className="hide-mobile">Exportar</span>
            </button>

            <button className="btn btn-ghost btn-sm" onClick={onGoHome} title="Cerrar y volver a proyectos">
              <X size={16} />
              <span className="hide-mobile">Cerrar</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}