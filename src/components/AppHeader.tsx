import React from 'react';
import type { Project } from '../types/index';
import { 
  RotateCcw, 
  Download, 
  X, 
  ChevronRight, 
  Sun, 
  Moon, 
  Monitor, 
  Settings, 
  ArrowLeft, 
  Layers,
  Cloud 
} from 'lucide-react';
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
  onOpenSync?: () => void;
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
  onOpenConfig,
  onOpenSync
}: AppHeaderProps) {
  const { themeMode, toggleTheme } = useTheme();

  return (
    <header className="topbar">
      {/* Botón de volver al Dashboard */}
      {screen === 'editor' ? (
        <button
          className="btn btn-ghost btn-xs"
          onClick={onGoHome}
          title="Volver a la lista de proyectos"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', color: 'var(--on-surface)' }}
        >
          <ArrowLeft size={15} />
          <span className="hide-mobile" style={{ fontSize: '12px' }}>Proyectos</span>
        </button>
      ) : (
        <span
          className="topbar-logo"
          onClick={onGoHome}
          title="Ir al Inicio"
        >
          <Layers size={16} style={{ color: 'var(--primary)' }} />
          <span>Traza</span>
        </span>
      )}

      {screen === 'editor' && activeProject && (
        <span className="topbar-crumb" style={{ fontSize: '12px' }}>
          <ChevronRight size={13} style={{ opacity: 0.5 }} />
          <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
            {activeProject.nombre || 'Proyecto'}
          </span>
          {activeAmbienteName && (
            <span style={{ opacity: 0.7, maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              / {activeAmbienteName}
            </span>
          )}
        </span>
      )}

      {modeSelector && (
        <span className="topbar-mode-container">
          {modeSelector}
        </span>
      )}

      <span className="topbar-sep" />

      <div className="topbar-actions">
        {screen === 'projects' && (
          <>
            {onOpenSync && (
              <button
                className="btn-topbar"
                onClick={onOpenSync}
                title="Sincronización en la nube (Offline-First)"
              >
                <Cloud size={16} />
              </button>
            )}

            {onOpenConfig && (
              <button
                className="btn-topbar"
                onClick={onOpenConfig}
                title="Configuración general (Perfil, Drive, Tema)"
              >
                <Settings size={16} />
              </button>
            )}

            <button
              className="btn-topbar"
              onClick={toggleTheme}
              title={`Tema: ${themeMode === 'system' ? 'Sistema' : themeMode === 'dark' ? 'Oscuro' : 'Claro'}`}
            >
              {themeMode === 'system' && <Monitor size={16} />}
              {themeMode === 'dark' && <Moon size={16} />}
              {themeMode === 'light' && <Sun size={16} />}
            </button>
          </>
        )}

        {screen === 'editor' && (
          <>
            {canUndo && (
              <button 
                className="btn-topbar" 
                onClick={onUndo} 
                title="Deshacer (Undo)"
              >
                <RotateCcw size={15} />
              </button>
            )}
            
            <button
              className="btn btn-acc btn-xs"
              onClick={onShowExport}
              title="Exportar planos e informes"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '12px' }}
            >
              <Download size={14} />
              <span>Exportar</span>
            </button>

            <button
              className="btn btn-ghost btn-xs btn-icon"
              onClick={onGoHome}
              title="Cerrar y volver a proyectos"
              style={{ width: '28px', height: '28px', borderRadius: '50%' }}
            >
              <X size={15} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}