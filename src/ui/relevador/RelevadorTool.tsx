import { useState, useEffect } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useSymbols } from '../../core/SymbolsContext'
import { EditorTabProvider } from '../../core/EditorTabContext'
import { AppHeader } from '../../components/AppHeader'
import { EditorScreen } from './EditorScreen'
import { Preview } from './components/Preview'
import { MasterView } from './components/MasterView'
import type { Project, EditorTab, SelectedElement } from '../../types/index'

const PLANTA_TABS = ['resumen', 'general', 'hoja', 'paredes', 'aberturas', 'maestro', 'cobertura'] as const
const ELECTRICO_TABS = ['resumen', 'electrico', 'circuitos', 'conexiones'] as const

export function RelevadorTool() {
  const [editorMode, setEditorMode] = useState<'planta' | 'electrico'>('planta')
  const { symbolsLib } = useSymbols()
  
  // Zustand store
  const { 
    projects,
    activeProjectId,
    activeAmbienteId,
    setActiveAmbienteId,
    updateProject,
    updateAmbiente,
    addAmbiente,
    deleteAmbiente,
    addProject,
    selectProject
  } = useProjectStore()

  let activeProject = projects.find(p => p.id === activeProjectId)
  if (!activeProject && projects.length > 0) activeProject = projects[0]
  const activeAmbiente = activeProject?.ambientes?.find(a => a.id === activeAmbienteId) || activeProject?.ambientes?.[0]

  // Mock UI state (previously from ProjectContext)
  const [activeTab, setActiveTab] = useState<EditorTab>('resumen')
  const [mobileEditorVisible, setMobileEditorVisible] = useState(false)
  
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null)

  useEffect(() => {
    setSelectedElement(null)
  }, [activeAmbienteId])

  const handleModeChange = (next: 'planta' | 'electrico') => {
    setEditorMode(next)
    const valid = next === 'planta' ? PLANTA_TABS : ELECTRICO_TABS
    if (!(valid as readonly string[]).includes(activeTab)) {
      setActiveTab(valid[0] as EditorTab)
    }
  }

  const isPlanta = editorMode === 'planta'
  const showMasterView = isPlanta && activeTab === 'maestro'

  const modeSelector = (
    <div className="mode-segmented-control" style={{ display: 'flex', background: 'var(--bg)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border)' }}>
      <button 
        onClick={() => handleModeChange('planta')}
        style={{ padding: '4px 8px', fontSize: 12, borderRadius: '4px', background: isPlanta ? 'var(--primary)' : 'transparent', color: isPlanta ? 'white' : 'var(--text)', border: 'none', cursor: 'pointer', fontWeight: isPlanta ? 600 : 400 }}
      >
        🏗️ Planta
      </button>
      <button 
        onClick={() => handleModeChange('electrico')}
        style={{ padding: '4px 8px', fontSize: 12, borderRadius: '4px', background: !isPlanta ? 'var(--primary)' : 'transparent', color: !isPlanta ? 'white' : 'var(--text)', border: 'none', cursor: 'pointer', fontWeight: !isPlanta ? 600 : 400 }}
      >
        ⚡ Eléctrico
      </button>
    </div>
  )

  if (!activeProject) {
    const handleCreateProject = () => {
      const id = Date.now().toString()
      const newProject = {
        id,
        nombre: 'Nuevo Proyecto',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        clienteId: 'local',
        electricistaId: 'local',
        estado: 'relevamiento' as const,
        inmueble: { direccion: '', partido: '', provincia: '', uso: 'residencial' as const },
        suministro: { tension: 220, fases: 1 as const },
        escala: 50,
        grosor_pared_default: 0.15,
        alturaDefault: 2.6,
        ambientes: [{
          id: id + '-amb',
          nombre: 'Ambiente 1',
          paredes: [],
          aberturas: [],
          elementos: [],
          coberturas: []
        }],
        circuitos: [],
        conexiones: [],
        tableros: [],
        diferenciales: [],
        tramos: [],
        unifilDiagrams: [],
        hojasMaestras: []
      } as unknown as Project
      
      addProject(newProject)
      selectProject(id)
    }

    return (
      <div style={{ padding: 40, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <h2 style={{ fontSize: 32, marginBottom: 16 }}>Bienvenido a Traza</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: 32 }}>No hay proyectos activos. Creá uno para comenzar.</p>
        <button className="btn btn-primary" onClick={handleCreateProject} style={{ padding: '12px 24px', fontSize: 16 }}>
          ＋ Crear Proyecto
        </button>
      </div>
    )
  }

  return (
    <div className="app tool-relevador">
      <AppHeader
        screen="editor"
        activeProject={activeProject}
        activeAmbienteName={activeAmbiente?.nombre}
        canUndo={false}
        modeSelector={modeSelector}
        onGoHome={() => {}}
        onUndo={() => {}}
        onShowExport={() => {}}
      />

      <main className="main-content">
        <div className="workspace">
          {!activeAmbiente || !activeAmbienteId ? (
            <div className="empty" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Cargando ambiente...
            </div>
          ) : (
            <EditorTabProvider activeTab={activeTab} setActiveTab={setActiveTab}>
              {showMasterView ? (
                <MasterView
                  project={activeProject}
                  symbolsLib={symbolsLib}
                  onUpdateAmbiente={(id, fn) => updateProject(
                    activeProject.id,
                    p => ({ ...p, ambientes: p.ambientes.map(a => a.id === id ? fn(a) : a) })
                  )}
                  onUpdateProject={(fn) => updateProject(activeProject.id, fn)}
                  onSelectAmbiente={setActiveAmbienteId}
                />
              ) : (
                <>
                  <div className={`panel-left ${mobileEditorVisible ? 'mobile-visible' : ''}`}>
                    <EditorScreen
                      mode={editorMode}
                      project={activeProject}
                      activeAmbiente={activeAmbiente}
                      activeAmbienteId={activeAmbienteId}
                      symbolsLib={symbolsLib}
                      onUpdateAmbiente={updateAmbiente}
                      onUpdateProject={(fn: (p: Project) => Project) => updateProject(activeProject!.id, fn)}
                      onAddAmbiente={() => addAmbiente({ id: Date.now().toString(), nombre: 'Nuevo Ambiente' })}
                      onDeleteAmbiente={deleteAmbiente}
                      onSelectAmbiente={setActiveAmbienteId}
                      onSymbolDialog={() => {}}
                      onShowNetlist={() => {}}
                      globalMeasurements={[]}
                      onNewMeasurementModal={() => {}}
                      selectedElement={selectedElement}
                      onSelectElement={setSelectedElement}
                    />
                  </div>
                  <div className="panel-right">
                    <Preview
                      project={activeProject}
                      ambiente={activeAmbiente}
                      meta={activeProject}
                      symbolsLib={symbolsLib}
                      onCanvasClick={() => {}}
                      selectedElement={selectedElement}
                      onSelectElement={setSelectedElement}
                    />
                  </div>
                </>
              )}
            </EditorTabProvider>
          )}
        </div>
      </main>

      <button
        className="mobile-view-toggle"
        onClick={() => setMobileEditorVisible(!mobileEditorVisible)}
        title={mobileEditorVisible ? 'Ver plano' : 'Editar datos'}
      >
        {mobileEditorVisible ? '🗺️' : '✏️'}
      </button>
    </div>
  )
}
