import type { Project } from '../types/index';

interface AppHeaderProps {
  screen: 'projects' | 'editor';
  activeProject: Project | null;
  activeAmbienteName?: string;
  canUndo: boolean;
  modeSelector?: React.ReactNode;
  onGoHome: () => void;
  onUndo: () => void;
  onShowExport: () => void;
}

export function AppHeader({
  screen,
  activeProject,
  activeAmbienteName,
  canUndo,
  modeSelector,
  onGoHome,
  onUndo,
  onShowExport
}: AppHeaderProps) {
  return (
    <header className="topbar">
      <span className="topbar-logo" onClick={onGoHome}>ieBA</span>
      {screen === 'editor' && activeProject && (
        <span className="topbar-crumb">
          ▸ <span>{activeProject.nombre || 'Proyecto'}</span>
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
      <span className="topbar-sep"/>
      
      {screen === 'editor' && (
        <div className="topbar-actions">
          <button 
            className={`btn-topbar ${!canUndo ? 'disabled' : ''}`} 
            onClick={onUndo} 
            disabled={!canUndo} 
            title="Deshacer"
          >
            ↶
          </button>
          <button className="btn btn-acc btn-sm" onClick={onShowExport}>
            📥 Exportar
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onGoHome}>Cerrar</button>
        </div>
      )}
    </header>
  );
}