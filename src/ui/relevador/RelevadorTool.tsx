import { useState, useEffect } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useSymbols } from '../../core/SymbolsContext'
import { EditorTabProvider } from '../../core/EditorTabContext'
import { AppHeader } from '../../components/AppHeader'
import { EditorScreen } from './EditorScreen'
import { Preview } from './components/Preview'
import { MasterView } from './components/MasterView'
import { SymbolDialog } from '../../components/SymbolDialog'
import { Modal } from '../Modal'
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
import { 
  Building2, 
  Zap, 
  Map as MapIcon, 
  Pencil, 
  FileText, 
  FileSpreadsheet, 
  Binary, 
  Ruler, 
  Layers, 
  Download,
  Send 
} from 'lucide-react'
import { useClientsStore } from '../../store/useClientsStore'
import { enviarAlCotizador } from '../../lib/export/cotizadorBridge'

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
    selectProject,
    addMedicion,
  } = useProjectStore()

  const activeProject = projects.find(p => p.id === activeProjectId)
  const activeAmbiente = activeProject?.ambientes?.find(a => a.id === activeAmbienteId) || activeProject?.ambientes?.[0]

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
    <div className="mode-segmented-control" style={{ display: 'flex', background: 'var(--surface-container-high)', borderRadius: 'var(--r-full)', padding: '2px' }}>
      <button 
        onClick={() => handleModeChange('planta')}
        style={{
          padding: '6px 12px',
          fontSize: 12,
          borderRadius: 'var(--r-full)',
          background: isPlanta ? 'var(--primary)' : 'transparent',
          color: isPlanta ? 'var(--on-primary)' : 'var(--on-surface-var)',
          border: 'none',
          cursor: 'pointer',
          fontWeight: isPlanta ? 600 : 500,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <Building2 size={14} />
        <span>Planta</span>
      </button>
      <button 
        onClick={() => handleModeChange('electrico')}
        style={{
          padding: '6px 12px',
          fontSize: 12,
          borderRadius: 'var(--r-full)',
          background: !isPlanta ? 'var(--primary)' : 'transparent',
          color: !isPlanta ? 'var(--on-primary)' : 'var(--on-surface-var)',
          border: 'none',
          cursor: 'pointer',
          fontWeight: !isPlanta ? 600 : 500,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <Zap size={14} />
        <span>Eléctrico</span>
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
                   { tipo: 'fase' as const, seccion: 2.5, color: 'negro' },
                   { tipo: 'neutro' as const, seccion: 2.5, color: 'celeste' },
                   { tipo: 'pe' as const, seccion: 2.5, color: 'verde-amarillo' },
                 ],
                 conducto: 'PVC 20mm'
              };
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
    return null;
  }

  return (
    <div className="app tool-relevador">
      <AppHeader
        screen="editor"
        activeProject={activeProject}
        activeAmbienteName={activeAmbiente?.nombre}
        canUndo={false}
        modeSelector={modeSelector}
        onGoHome={() => selectProject(null)}
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
        {mobileEditorVisible ? <MapIcon size={24} /> : <Pencil size={24} />}
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
  const { getClientById } = useClientsStore();
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

  const handleSendCotizador = async () => {
    const client = getClientById(project.clienteId);
    const obra = client?.obras?.find(o => o.id === project.obraId);
    const res = await enviarAlCotizador(project, client, obra);
    if (confirm(`${res.message}\n\n¿Deseas abrir el Cotizador ahora?`)) {
      window.open(res.urlCotizador, '_blank');
    }
    onCancel();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title="Exportar Proyecto y Planos"
      maxWidth="480px"
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          <button className="btn btn-primary btn-full" onClick={handleDownload}>
            <Download size={16} />
            <span>Descargar Archivos Técnicos</span>
          </button>
          <button
            type="button"
            className="btn btn-acc btn-full"
            onClick={handleSendCotizador}
            style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)', border: '1px solid var(--primary)' }}
          >
            <Send size={15} />
            <span>💼 Enviar Cómputo al Cotizador (ieBA)</span>
          </button>
          <button className="btn btn-ghost btn-full" onClick={handleAll}>
            <span>Descargar Todo (MD + CSVs + SVGs)</span>
          </button>
        </div>
      }
    >
      <p className="m3-body-small" style={{ color: 'var(--on-surface-var)', marginTop: 0, marginBottom: 16 }}>
        Seleccioná los informes y planos técnicos que querés generar para el proyecto <strong>{project.nombre}</strong>:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={opts.md} onChange={e => setOpts({ ...opts, md: e.target.checked })} />
          <FileText size={16} style={{ color: 'var(--primary)' }} />
          <span>Informe Técnico Completo (Markdown)</span>
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={opts.mat} onChange={e => setOpts({ ...opts, mat: e.target.checked })} />
          <FileSpreadsheet size={16} style={{ color: 'var(--primary)' }} />
          <span>Planilla de Cómputo de Materiales (CSV)</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={opts.bocas} onChange={e => setOpts({ ...opts, bocas: e.target.checked })} />
          <Zap size={16} style={{ color: 'var(--primary)' }} />
          <span>Listado de Bocas y Alturas (CSV)</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={opts.circs} onChange={e => setOpts({ ...opts, circs: e.target.checked })} />
          <Binary size={16} style={{ color: 'var(--primary)' }} />
          <span>Listado de Circuitos (CSV)</span>
        </label>

        {(project.campanias && project.campanias.length > 0) && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={opts.mediciones} onChange={e => setOpts({ ...opts, mediciones: e.target.checked })} />
            <Ruler size={16} style={{ color: 'var(--primary)' }} />
            <span>Reportes de Mediciones (MD y CSV)</span>
          </label>
        )}

        {ambiente && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={opts.svgActive} onChange={e => setOpts({ ...opts, svgActive: e.target.checked })} />
            <Layers size={16} style={{ color: 'var(--primary)' }} />
            <span>Plano SVG de {ambiente.nombre}</span>
          </label>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={opts.svgAll} onChange={e => setOpts({ ...opts, svgAll: e.target.checked })} />
          <MapIcon size={16} style={{ color: 'var(--primary)' }} />
          <span>Planos SVG de Todos los Ambientes</span>
        </label>
      </div>
    </Modal>
  );
}
