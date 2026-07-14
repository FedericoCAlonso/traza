import { useState } from 'react';
// Layout y Composición
import { EditorLayout } from './components/EditorLayout';
import { CreationFlowOverlay } from './components/CreationFlowOverlay';

// Pestañas (Subcomponentes especializados)
import { GeneralTab } from './components/tabs/GeneralTab';
import { ProjectTab } from './components/tabs/ProjectTab';
import { WallsTab } from './components/tabs/WallsTab';
import { OpeningTab } from './components/tabs/OpeningTab';
import { StairsTab } from './components/tabs/StairsTab';
import { ElectricalTab } from './components/tabs/ElectricalTab';
import { CircuitsTab } from './components/tabs/CircuitsTab';
import { ConnectionsTab } from './components/tabs/ConnectionsTab';
import { CoverageTab } from './components/tabs/CoverageTab';
import { ResumenTab } from './components/tabs/ResumenTab';
import { MedicionesTab } from './components/tabs/MedicionesTab';

// Hooks y Lógica
import { useEditorTab } from '../../core/EditorTabContext';
import { useEditorState } from '../../hooks/useEditorState';

// Tipos
import {
  type Project, type Ambiente, type SymbolDialogData,
  type EditorTab, type SelectedElement
} from '../../types/index';

interface EditorScreenProps {
  mode: 'planta' | 'electrico';
  project: Project;
  activeAmbiente: Ambiente;
  activeAmbienteId: string;
  symbolsLib: import('../../lib/symbols').DefinicionSimbolo[];
  onUpdateAmbiente: (updateFn: (amb: Ambiente) => Ambiente) => void;
  onUpdateProject: (fn: (p: Project) => Project) => void;
  onAddAmbiente: () => void;
  onDeleteAmbiente: (id: string) => void;
  onSelectAmbiente: (id: string) => void;
  onSymbolDialog: (data: SymbolDialogData) => void;
  onShowNetlist: () => void;
  globalMeasurements?: import('../../types/index').Measurement[];
  onNewMeasurementModal?: (elementoId: string, moduleType: import('../../types/index').ModuleType) => void;
  selectedElement: SelectedElement;
  onSelectElement: (el: SelectedElement) => void;
  /** ID de la campaña de medición activa (para el flujo toca-en-plano). */
  campaniaActivaId: string | null;
  onSetCampaniaActiva: (id: string | null) => void;
}

const PLANTA_TABS: EditorTab[] = ['resumen', 'general', 'hoja', 'paredes', 'aberturas', 'escaleras', 'maestro', 'cobertura'];
const ELECTRICO_TABS: EditorTab[] = ['resumen', 'electrico', 'circuitos', 'conexiones', 'mediciones'];

export function EditorScreen(props: EditorScreenProps) {
  const { 
    mode,
    project, 
    activeAmbiente, 
    activeAmbienteId, 
    symbolsLib, 
    onUpdateAmbiente, 
    onUpdateProject, 
    onAddAmbiente, 
    onDeleteAmbiente, 
    onSelectAmbiente, 
    onSymbolDialog, 
    onShowNetlist,
    globalMeasurements,
    onNewMeasurementModal,
    selectedElement,
    onSelectElement,
    campaniaActivaId,
    onSetCampaniaActiva,
  } = props;

  const { activeTab, setActiveTab } = useEditorTab();

  const state = useEditorState(
    project, 
    activeAmbiente, 
    onUpdateAmbiente, 
    onUpdateProject
  );

  const [pendingBocaForCircuit, setPendingBocaForCircuit] = useState<string | null>(null);

  const handleStartCircuitForBoca = (bocaId: string) => {
    setPendingBocaForCircuit(bocaId);
    setActiveTab('circuitos');
  };

  const handleCircuitCreated = (circuitoId: string) => {
    if (pendingBocaForCircuit) {
      state.updateElectrical(ps => ps.map(x => x.id === pendingBocaForCircuit ? { ...x, circuitoId } : x));
      setPendingBocaForCircuit(null);
      setActiveTab('electrico');
    }
  };

  const handleCircuitCreationCanceled = () => {
    if (pendingBocaForCircuit) {
      setPendingBocaForCircuit(null);
      setActiveTab('electrico');
    }
  };

  const tabConfig: Record<EditorTab, { label: string, icon: string }> = {
    resumen:     { label: 'Resumen',  icon: '📊' },
    general:     { label: 'General',  icon: '📋' },
    hoja:        { label: 'Hoja',     icon: '🏠' },
    paredes:     { label: 'Paredes',  icon: '🧱' },
    aberturas:   { label: 'Abert.',   icon: '🚪' },
    escaleras:   { label: 'Escal.',   icon: '🪜' },
    electrico:   { label: 'Bocas',    icon: '⚡' },
    circuitos:   { label: 'Circ.',    icon: '🔌' },
    conexiones:  { label: 'Canal.',   icon: '🔗' },
    mediciones:  { label: 'Medic.',   icon: '📐' },
    maestro:     { label: 'Maestro',  icon: '🗺️' },
    cobertura:   { label: 'Cobert.',  icon: '☂️' }
  };

  const visibleTabs = mode === 'planta' ? PLANTA_TABS : ELECTRICO_TABS;

  if (!project || !activeAmbiente) {
    return <div className="empty">Sin proyecto seleccionado</div>;
  }

  return (
    <EditorLayout
      sheetBar={
        <div className="amb-bar">
          {(project.ambientes || []).map((a) => (
            <button
              key={a.id}
              className={`amb-tab ${a.id === activeAmbienteId ? 'active' : ''}`}
              onClick={() => onSelectAmbiente(a.id)}
            >
              {a.nombre}
              {a.tipoAmbiente && a.tipoAmbiente !== 'interior' && (
                <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>
                  {a.tipoAmbiente === 'exterior' ? '☀' : '⛅'}
                </span>
              )}
            </button>
          ))}
          <button 
            className="amb-tab-add" 
            onClick={onAddAmbiente} 
            title="Nueva hoja de relevamiento"
          >＋</button>
        </div>
      }
      tabBar={
        <div className="panel-tabs" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
          {visibleTabs.map((k) => (
            <button
              key={k}
              className={`panel-tab ${activeTab === k ? 'active' : ''}`}
              onClick={() => {
                onSelectElement(null);
                setActiveTab(k);
              }}
            >
              <span style={{ fontSize: 16 }}>{tabConfig[k].icon}</span>
              <span>{tabConfig[k].label}</span>
            </button>
          ))}
        </div>
      }

    >
      <CreationFlowOverlay 
        creationFlow={state.creationFlow}
        allVertices={state.allVertices}
        onCancel={state.cancelCreation}
        onStepChange={state.setCreationStep}
        onAnchorSelect={state.setCreationAnchor}
        onOffsetChange={state.setCreationOffset}
        onConfirm={state.confirmCreation}
      />

      {mode === 'planta' && activeTab === 'resumen' && (
        <ResumenTab project={project} activeAmbiente={activeAmbiente} />
      )}

      {mode === 'planta' && activeTab === 'general' && (
        <GeneralTab project={project} onUpdateProject={onUpdateProject} />
      )}

      {mode === 'planta' && activeTab === 'hoja' && (
        <ProjectTab 
          project={project}
          activeAmbiente={activeAmbiente}
          onUpdateAmbiente={onUpdateAmbiente}
          onDeleteAmbiente={onDeleteAmbiente}
        />
      )}

      {mode === 'planta' && activeTab === 'paredes' && !state.creationFlow.active && (
        <WallsTab 
          activeAmbiente={activeAmbiente}
          onUpdateAmbiente={onUpdateAmbiente}
          selectedElement={selectedElement}
          onSelectElement={onSelectElement}
        />
      )}

      {mode === 'planta' && activeTab === 'aberturas' && (
        <OpeningTab 
          project={project}
          activeAmbiente={activeAmbiente}
          activeAmbienteId={activeAmbienteId}
          updateOpenings={state.updateOpenings}
          onLinkOpening={state.linkOpening}
          selectedElement={selectedElement}
          onSelectElement={onSelectElement}
        />
      )}

      {mode === 'planta' && activeTab === 'escaleras' && (
        <StairsTab 
          activeAmbiente={activeAmbiente}
          onUpdateAmbiente={onUpdateAmbiente}
        />
      )}

      {mode === 'planta' && activeTab === 'cobertura' && !state.creationFlow.active && (
        <CoverageTab 
          activeAmbiente={activeAmbiente}
          onUpdateAmbiente={onUpdateAmbiente}
          onStartCreation={() => state.startCreation('cobertura')}
        />
      )}

      {mode === 'planta' && activeTab === 'maestro' && (
        <div className="empty">Cambiando a vista Maestro…</div>
      )}

      {mode === 'electrico' && activeTab === 'resumen' && (
        <ResumenTab project={project} activeAmbiente={activeAmbiente} />
      )}

      {mode === 'electrico' && activeTab === 'electrico' && (
        <ElectricalTab 
          project={project}
          activeAmbiente={activeAmbiente}
          symbolsLib={symbolsLib}
          circuitos={state.circuitos}
          updateElectrical={state.updateElectrical}
          updateStructural={state.updateStructural}
          onSymbolDialog={onSymbolDialog}
          onShowNetlist={onShowNetlist}
          pendingConnection={state.pendingConnection}
          onStartConnecting={state.startConnecting}
          onFinishConnecting={state.finishConnecting}
          onCancelConnecting={state.cancelConnecting}
          globalMeasurements={globalMeasurements}
          onNewMeasurementModal={onNewMeasurementModal}
          onStartCircuitForBoca={handleStartCircuitForBoca}
          selectedElement={selectedElement}
          onSelectElement={onSelectElement}
        />
      )}

      {mode === 'electrico' && activeTab === 'circuitos' && (
        <CircuitsTab 
          onCircuitCreated={handleCircuitCreated}
          onCancelCircuitRequest={handleCircuitCreationCanceled}
          pendingBoca={pendingBocaForCircuit}
        />
      )}

      {mode === 'electrico' && activeTab === 'conexiones' && (
        <ConnectionsTab 
          project={project}
          circuitos={state.circuitos}
          conexiones={state.conexiones}
          updateConexiones={state.updateConexiones}
        />
      )}

      {mode === 'electrico' && activeTab === 'mediciones' && (
        <MedicionesTab
          project={project}
          campaniaActivaId={campaniaActivaId}
          onSetCampaniaActiva={onSetCampaniaActiva}
        />
      )}
    </EditorLayout>
  );
}
