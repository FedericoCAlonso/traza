import { useCallback } from 'react';
import * as STORAGE from '../lib/storage';
import { RENDERER } from '../lib/renderer';
import type { Project, Ambiente, ElementoElectrico, SymbolDialogData, EditorTab } from '../types/index';

interface UseAppActionsProps {
  activeProject: Project | null;
  activeAmbiente: Ambiente | null;
  updateAmbiente: (fn: (amb: Ambiente) => Ambiente) => void;
  addProject: (p: Project) => void;
  selectProject: (id: string) => void;
  openEditor: (visible?: boolean) => void;
  showToast: (msg: string) => void;
  setSymDialog: (data: SymbolDialogData | null) => void;
  activeTab: EditorTab;
  updateProject: (id: string, fn: (p: Project) => Project) => void;
  pendingConnectionStart: string | null;
  setPendingConnectionStart: (id: string | null) => void;
}

export function useAppActions({
  activeProject,
  activeAmbiente,
  updateAmbiente,
  addProject,
  selectProject,
  openEditor,
  showToast,
  setSymDialog,
  activeTab,
  updateProject,
  pendingConnectionStart,
  setPendingConnectionStart
}: UseAppActionsProps) {

  /**
   * Procesa la inserción o edición de un símbolo eléctrico
   */
  const handleSymConfirm = useCallback((updatedElement: ElementoElectrico | null, currentDialog: SymbolDialogData) => {
    if (!activeAmbiente) return;

    updateAmbiente((amb: Ambiente) => {
      let nuevosElementos: ElementoElectrico[];
      if (updatedElement === null && currentDialog?.mode === 'edit') {
        nuevosElementos = amb.elementos.filter(e => e.id !== currentDialog.existing.id);
      } else if (updatedElement && currentDialog?.mode === 'edit') {
        nuevosElementos = amb.elementos.map(e => e.id === updatedElement.id ? updatedElement : e);
      } else if (updatedElement && currentDialog?.mode === 'create') {
        nuevosElementos = [...amb.elementos, updatedElement];
      } else return amb;
      
      return { ...amb, elementos: nuevosElementos };
    });
    setSymDialog(null);
  }, [activeAmbiente, updateAmbiente, setSymDialog]);

  /**
   * Maneja clicks en el plano técnico
   */
  const handleCanvasClick = useCallback((
    rawX: number,
    rawY: number,
    snapSegIdx: number | undefined,
    snapPos: number | undefined,
    clickedElecId: string | undefined,
    snapLado?: 'interior' | 'exterior'
  ) => {
    if (!activeAmbiente || !activeProject) return;

    if (clickedElecId) {
      if (activeTab === 'conexiones') {
        if (!pendingConnectionStart) {
          setPendingConnectionStart(clickedElecId);
          showToast('Boca origen seleccionada. Tocá la boca destino.');
        } else {
          if (pendingConnectionStart !== clickedElecId) {
            updateProject(activeProject.id, p => ({
              ...p,
              conexiones: [
                ...(p.conexiones || []),
                STORAGE.createConexion(
                  { ambienteId: activeAmbiente.id, elementoId: pendingConnectionStart },
                  { ambienteId: activeAmbiente.id, elementoId: clickedElecId }
                )
              ]
            }));
            showToast('Conexión creada');
          }
          setPendingConnectionStart(null);
        }
        return;
      }

      const el = activeAmbiente.elementos?.find(x => x.id === clickedElecId);
      if (el) {
        setSymDialog({ mode: 'edit', existing: el });
        return;
      }
    }

    if (activeTab === 'electrico') {
      setSymDialog({ mode: 'create', x: rawX, y: rawY, snapSegIdx, snapPos, snapLado });
      return;
    }

    if (activeTab === 'aberturas' && snapSegIdx !== undefined) {
      const { allSegs: segs } = RENDERER.buildSegs(activeAmbiente, activeProject);
      const seg = segs[snapSegIdx];
      if (!seg) return;

      const posM = parseFloat((snapPos ?? 0).toFixed(2));
      const lastAb = activeAmbiente.aberturas?.length 
        ? activeAmbiente.aberturas[activeAmbiente.aberturas.length - 1] 
        : null;

      const nuevaAbertura = STORAGE.createAbertura({
        pared: snapSegIdx,
        posicion: posM,
        ...(lastAb ? { 
          tipo: lastAb.tipo, ancho: lastAb.ancho, 
          hojas: lastAb.hojas, sentido: lastAb.sentido 
        } : {}),
        lado: snapLado || 'interior',
      });

      updateAmbiente((amb: Ambiente) => ({
        ...amb,
        aberturas: [...(amb.aberturas || []), nuevaAbertura],
      }));

      showToast(`Abertura en Pared ${snapSegIdx} — ${posM}m`);
      openEditor(true);
    }
  }, [activeAmbiente, activeProject, activeTab, setSymDialog, updateAmbiente, showToast, openEditor, pendingConnectionStart, setPendingConnectionStart, updateProject]);

  /**
   * Importa un proyecto desde JSON
   */
  const handleImportProject = useCallback((data: any) => {
    const newProject: Project = {
      ...STORAGE.createProject(),
      ...data,
      id: Date.now().toString(),
      updatedAt: Date.now(),
      ambientes: data.ambientes || [{ 
        ...STORAGE.createAmbiente(), 
        paredes: data.paredes || [], 
        aberturas: data.aberturas || [], 
        elementos: data.elementos || [] 
      }]
    };
    
    // Limpieza de campos legacy si existen
    const legacyFields = newProject as unknown as Record<string, unknown>;
    delete legacyFields['paredes'];
    delete legacyFields['aberturas'];
    delete legacyFields['elementos'];

    addProject(newProject);
    selectProject(newProject.id);
    openEditor(true);
    showToast('Proyecto importado');
  }, [addProject, selectProject, openEditor, showToast]);

  return {
    handleSymConfirm,
    handleCanvasClick,
    handleImportProject
  };
}
