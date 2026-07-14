import { useState, useEffect } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useSymbols } from '../../core/SymbolsContext'
import { EditorTabProvider } from '../../core/EditorTabContext'
import { AppHeader } from '../../components/AppHeader'
import { EditorScreen } from './EditorScreen'
import { Preview } from './components/Preview'
import { MasterView } from './components/MasterView'
import { SymbolDialog } from '../../components/SymbolDialog'
import { 
  exportToMarkdown, 
  exportMaterialsToCSV, 
  exportToCSV, 
  getCircuitPathsAndDetails, 
  exportEnvironmentToSVG, 
  exportAllProjectData,
  exportCampaniaReport,
  exportCampaniaToCSV
} from '../../lib/exporters'
import type { Project, EditorTab, SelectedElement, SymbolDialogData, Ambiente } from '../../types/index'
import type { MedicionCampania, ElementoMedicionRef } from '../../types/measurements'
import { MedicionFormModal } from './components/MedicionFormModal'

const PLANTA_TABS = ['resumen', 'general', 'hoja', 'paredes', 'aberturas', 'maestro', 'cobertura'] as const
const ELECTRICO_TABS = ['resumen', 'electrico', 'circuitos', 'conexiones', 'mediciones'] as const

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
    selectProject,
    addMedicion,
  } = useProjectStore()

  let activeProject = projects.find(p => p.id === activeProjectId)
  if (!activeProject && projects.length > 0) activeProject = projects[0]
  const activeAmbiente = activeProject?.ambientes?.find(a => a.id === activeAmbienteId) || activeProject?.ambientes?.[0]

  // Mock UI state (previously from ProjectContext)
  const [activeTab, setActiveTab] = useState<EditorTab>('resumen')
  const [mobileEditorVisible, setMobileEditorVisible] = useState(false)
  
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null)
  const [symDialog, setSymDialog] = useState<SymbolDialogData | null>(null)
  const [pendingConnectionStart, setPendingConnectionStart] = useState<string | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [campaniaActivaId, setCampaniaActivaId] = useState<string | null>(null)
  const [medicionDialog, setMedicionDialog] = useState<{
    elementoRef: ElementoMedicionRef;
    elementoLabel: string;
  } | null>(null)

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

  const handleCanvasClick = (x: number, y: number, paredIdx?: number, paredPos?: number, clickedElecId?: string, lado?: 'interior' | 'exterior') => {
    if (editorMode === 'electrico') {
      if (activeTab === 'conexiones') {
        if (clickedElecId) {
          if (!pendingConnectionStart) {
            setPendingConnectionStart(clickedElecId);
          } else {
            if (pendingConnectionStart === clickedElecId) {
              setPendingConnectionStart(null); // Desmarcar
              setSelectedElement(null);
            } else {
              // Crear conexión
              const nuevaConexion = {
                 id: Date.now().toString(),
                 from: { ambienteId: activeAmbienteId!, elementoId: pendingConnectionStart },
                 to: { ambienteId: activeAmbienteId!, elementoId: clickedElecId },
                 cables: [
                   { tipo: 'fase', seccion: 2.5, color: 'negro' },
                   { tipo: 'neutro', seccion: 2.5, color: 'celeste' },
                   { tipo: 'pe', seccion: 2.5, color: 'verde-amarillo' },
                 ],
                 conducto: 'PVC 20mm'
              } as any;
              updateProject(activeProject!.id, p => ({
                 ...p,
                 conexiones: [...(p.conexiones || []), nuevaConexion]
              }));
              setPendingConnectionStart(null);
              setSelectedElement(null);
            }
          }
        } else {
          // Click en vacío, cancelar conexión pendiente
          if (pendingConnectionStart) {
            setPendingConnectionStart(null);
            setSelectedElement(null);
          }
        }
        return;
      }

      if (activeTab === 'electrico') {
        if (clickedElecId) return; // Si clickea en un elemento, Preview ya maneja la selección
        setSymDialog({ mode: 'create', x, y, snapSegIdx: paredIdx, snapPos: paredPos, snapLado: lado });
      }
    }

    // ─── MODO MEDICIÓN ───
    if (editorMode === 'electrico' && activeTab === 'mediciones' && campaniaActivaId && clickedElecId) {
      const campania = activeProject?.campanias?.find(c => c.id === campaniaActivaId)
      if (!campania) return
      if (campania.estado === 'cerrada') {
        alert('Esta campaña está cerrada. Creá una nueva campaña para registrar más mediciones.')
        return
      }
      const el = activeAmbiente?.elementos.find(e => e.id === clickedElecId)
      const ambNombre = activeAmbiente?.nombre ?? ''
      const elLabel = el ? `${ambNombre} › ${el.referencia || el.tipo}` : `${ambNombre} › (elemento)`
      const ref: ElementoMedicionRef = el?.esTablero
        ? { tipo: 'tablero', ambienteId: activeAmbienteId!, elementoId: clickedElecId }
        : { tipo: 'boca',    ambienteId: activeAmbienteId!, elementoId: clickedElecId }
      setMedicionDialog({ elementoRef: ref, elementoLabel: elLabel })
    }
  }

  const handleSymConfirm = (nuevo: any) => {
    if (!activeAmbienteId || !activeProject) return;
    
    updateProject(activeProject.id, p => {
      return {
        ...p,
        ambientes: p.ambientes.map(a => {
          if (a.id !== activeAmbienteId) return a;
          const elementos = a.elementos || [];
          if (symDialog?.mode === 'create') {
            return { ...a, elementos: [...elementos, { ...nuevo, id: Date.now().toString() }] };
          } else if (symDialog?.mode === 'edit') {
            return { ...a, elementos: elementos.map(el => el.id === nuevo.id ? nuevo : el) };
          }
          return a;
        })
      };
    });
    setSymDialog(null);
  }

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
        onShowExport={() => setShowExportModal(true)}
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
                      onSymbolDialog={setSymDialog}
                      onShowNetlist={() => {}}
                      globalMeasurements={[]}
                      onNewMeasurementModal={() => {}}
                      selectedElement={selectedElement}
                      onSelectElement={setSelectedElement}
                      campaniaActivaId={campaniaActivaId}
                      onSetCampaniaActiva={setCampaniaActivaId}
                    />
                  </div>
                  <div className="panel-right">
                    <Preview
                      project={activeProject}
                      ambiente={activeAmbiente}
                      meta={activeProject}
                      symbolsLib={symbolsLib}
                      onCanvasClick={handleCanvasClick}
                      selectedElement={selectedElement}
                      onSelectElement={setSelectedElement}
                      campaniaActivaId={campaniaActivaId}
                    />
                  </div>
                </>
              )}
            </EditorTabProvider>
          )}
        </div>
      </main>

      {symDialog && (
        <SymbolDialog
          clickData={symDialog}
          symbolsLib={symbolsLib}
          escala={activeProject.escala}
          ambienteAltura={activeAmbiente?.alturaLocal || activeProject.alturaDefault}
          onConfirm={handleSymConfirm}
          onCancel={() => setSymDialog(null)}
        />
      )}

      {medicionDialog && campaniaActivaId && (() => {
        const campania = activeProject.campanias?.find(c => c.id === campaniaActivaId)
        if (!campania) return null
        return (
          <MedicionFormModal
            elementoRef={medicionDialog.elementoRef}
            elementoLabel={medicionDialog.elementoLabel}
            campania={campania}
            onConfirm={(data) => {
              const nueva: MedicionCampania = {
                ...data,
                id: crypto.randomUUID(),
                fechaHora: Date.now(),
              }
              addMedicion(activeProject.id, nueva)
              setMedicionDialog(null)
            }}
            onCancel={() => setMedicionDialog(null)}
          />
        )
      })()}

      {showExportModal && (
        <ExportModal
          project={activeProject}
          ambiente={activeAmbiente || null}
          onCancel={() => setShowExportModal(false)}
        />
      )}


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

interface ExportModalProps {
  project: Project;
  ambiente: Ambiente | null;
  onCancel: () => void;
}

function ExportModal({ project, ambiente, onCancel }: ExportModalProps) {
  const [opts, setOpts] = useState({
    md: true,
    mat: true,
    bocas: true,
    circs: true,
    mediciones: true,
    svgActive: true,
    svgAll: false,
  });

  const handleDownload = () => {
    if (opts.md) {
      exportToMarkdown(project);
    }
    if (opts.mat) {
      exportMaterialsToCSV(project);
    }
    if (opts.bocas) {
      const dataBocas = project.ambientes.flatMap(a => 
        a.elementos.map(el => {
          const circ = project.circuitos?.find(c => c.id === el.circuitoId);
          const circName = circ ? circ.nombre : 'N/A';
          return {
            Hoja: a.nombre,
            Referencia: el.referencia || 'S/R',
            Tipo: el.tipo,
            Altura: el.altura || 0,
            Circuito: circName
          };
        })
      );
      exportToCSV(dataBocas, `${project.nombre.replace(/ /g, '_')}_Bocas.csv`);
    }
    if (opts.circs) {
      const dataCirc = (project.circuitos || []).map(c => {
        const details = getCircuitPathsAndDetails(project, c.id);
        return {
          Nombre: c.nombre,
          Tipo: c.tipo,
          Bocas: details.bocasCount,
          LongitudMax_m: details.longitudMaxima.toFixed(2),
          BocaMasLejana: details.farthestNodeName
        };
      });
      exportToCSV(dataCirc, `${project.nombre.replace(/ /g, '_')}_Circuitos.csv`);
    }
    if (opts.mediciones && project.campanias) {
      project.campanias.forEach(c => {
        exportCampaniaReport(project, c.id);
        exportCampaniaToCSV(project, c.id);
      });
    }
    if (opts.svgActive && ambiente) {
      exportEnvironmentToSVG(ambiente, project);
    }
    if (opts.svgAll) {
      project.ambientes.forEach(amb => {
        if (amb.id !== ambiente?.id || !opts.svgActive) {
          exportEnvironmentToSVG(amb, project);
        }
      });
    }
    onCancel();
  };

  const handleAll = () => {
    exportAllProjectData(project);
    onCancel();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: 16
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: 420,
        background: 'var(--surface-1)',
        padding: 20,
        borderRadius: 16,
        boxShadow: 'var(--shadow-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-h)' }}>📥 Exportar Proyecto</h3>
          <button className="btn btn-ghost btn-sm" onClick={onCancel} style={{ padding: 4, minWidth: 'auto', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
        </div>
        
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)' }}>
          Seleccioná los informes y planos que querés generar para el proyecto <strong>{project.nombre}</strong>:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
            <input type="checkbox" checked={opts.md} onChange={e => setOpts({ ...opts, md: e.target.checked })} />
            <span>📄 Informe Técnico Completo (Markdown)</span>
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
            <input type="checkbox" checked={opts.mat} onChange={e => setOpts({ ...opts, mat: e.target.checked })} />
            <span>📊 Planilla de Cómputo de Materiales (CSV)</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
            <input type="checkbox" checked={opts.bocas} onChange={e => setOpts({ ...opts, bocas: e.target.checked })} />
            <span>⚡ Listado de Bocas y Alturas (CSV)</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
            <input type="checkbox" checked={opts.circs} onChange={e => setOpts({ ...opts, circs: e.target.checked })} />
            <span>🔢 Listado de Circuitos (CSV)</span>
          </label>

          {(project.campanias && project.campanias.length > 0) && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
              <input type="checkbox" checked={opts.mediciones} onChange={e => setOpts({ ...opts, mediciones: e.target.checked })} />
              <span>📐 Reportes de Mediciones (MD y CSV)</span>
            </label>
          )}

          {ambiente && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
              <input type="checkbox" checked={opts.svgActive} onChange={e => setOpts({ ...opts, svgActive: e.target.checked })} />
              <span>🗺️ Plano SVG de {ambiente.nombre}</span>
            </label>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
            <input type="checkbox" checked={opts.svgAll} onChange={e => setOpts({ ...opts, svgAll: e.target.checked })} />
            <span>🗺️ Planos SVG de Todos los Ambientes</span>
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <button className="btn btn-acc btn-full" onClick={handleDownload}>
            Descargar Seleccionados
          </button>
          <button className="btn btn-ghost btn-full" onClick={handleAll} style={{ border: '1px solid var(--outline-var)' }}>
            Descargar Todo (MD + CSVs + SVGs)
          </button>
        </div>
      </div>
    </div>
  );
}
