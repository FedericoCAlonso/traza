import { create } from 'zustand'
import type { Project, Ambiente } from '../types/index'
import type { Campania, MedicionCampania } from '../types/measurements'
import { auth } from '../lib/firebase'
import { saveProject, removeProject } from '../lib/firestore'

/**
 * Garantiza que todos los arrays opcionales de un Ambiente siempre existan.
 */
export function normalizeAmbiente(a: Ambiente): Ambiente {
  return {
    ...a,
    paredes:              a.paredes              || [],
    aberturas:            a.aberturas            || [],
    elementos:            a.elementos            || [],
    coberturas:           a.coberturas           || [],
    elementosEstructurales: a.elementosEstructurales || [],
  }
}

/**
 * Normaliza un proyecto completo, garantizando que todos sus arrays existan.
 */
export function normalizeProject(p: Project): Project {
  return {
    ...p,
    ambientes:          (p.ambientes     || []).map(normalizeAmbiente),
    circuitos:          p.circuitos     || [],
    tableros:           p.tableros      || [],
    conexiones:         p.conexiones    || [],
    diferenciales:      p.diferenciales || [],
    tramos:             p.tramos        || [],
    unifilDiagrams:     p.unifilDiagrams || [],
    hojasMaestras:      p.hojasMaestras || [],
    campanias:          p.campanias          || [],
    medicionesCampania: p.medicionesCampania || [],
  }
}

interface ProjectState {
  projects: Project[]
  activeProjectId: string | null
  activeAmbienteId: string | null
  
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  selectProject: (id: string | null) => void
  updateProject: (id: string, fn: (p: Project) => Project) => void
  deleteProject: (id: string) => void
  
  setActiveAmbienteId: (id: string | null) => void
  updateAmbiente: (fn: (a: Ambiente) => Ambiente) => void
  addAmbiente: (ambiente: Partial<Ambiente> & { id: string; nombre: string }) => void
  deleteAmbiente: (id: string) => void

  // Campañas de medición
  addCampania: (projectId: string, campania: Campania) => void
  updateCampania: (projectId: string, campaniaId: string, patch: Partial<Campania>) => void
  closeCampania: (projectId: string, campaniaId: string) => void
  deleteCampania: (projectId: string, campaniaId: string) => void

  // Mediciones de campaña
  addMedicion: (projectId: string, medicion: MedicionCampania) => void
  deleteMedicion: (projectId: string, medicionId: string) => void
}

const syncToFirebase = (project: Project) => {
  const user = auth.currentUser;
  if (user) {
    saveProject(user.uid, project).catch(console.error);
  }
};

const removeFromFirebase = (projectId: string) => {
  const user = auth.currentUser;
  if (user) {
    removeProject(user.uid, projectId).catch(console.error);
  }
};

export const useProjectStore = create<ProjectState>()(
  (set) => ({
    projects: [],
    activeProjectId: null,
    activeAmbienteId: null,

    setProjects: (projects) => {
      // Set projects directly from Firestore snapshot
      set({ projects: projects.map(normalizeProject) });
    },
    
    addProject: (project) => set((state) => {
      const p = normalizeProject(project);
      syncToFirebase(p);
      return { projects: [...state.projects, p] };
    }),
    
    selectProject: (id) => set((state) => {
      if (!id) {
        return { activeProjectId: null, activeAmbienteId: null }
      }
      const p = state.projects.find(x => x.id === id)
      return {
        activeProjectId: id,
        activeAmbienteId: p?.ambientes?.[0]?.id || null
      }
    }),

    updateProject: (id, fn) => set((state) => {
      let updatedProject: Project | null = null;
      const projects = state.projects.map(p => {
        if (p.id === id) {
          updatedProject = normalizeProject({ ...fn(p), updatedAt: Date.now() });
          return updatedProject;
        }
        return p;
      });
      if (updatedProject) syncToFirebase(updatedProject);
      return { projects };
    }),

    deleteProject: (id) => set((state) => {
      removeFromFirebase(id);
      return {
        projects: state.projects.filter(p => p.id !== id),
        activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        activeAmbienteId: state.activeProjectId === id ? null : state.activeAmbienteId
      };
    }),

    setActiveAmbienteId: (id) => set({ activeAmbienteId: id }),

    updateAmbiente: (fn) => set((state) => {
      if (!state.activeProjectId || !state.activeAmbienteId) return state;
      let updatedProject: Project | null = null;
      
      const projects = state.projects.map(p => {
        if (p.id !== state.activeProjectId) return p;
        updatedProject = {
          ...p,
          updatedAt: Date.now(),
          ambientes: p.ambientes.map(a => 
            a.id === state.activeAmbienteId ? normalizeAmbiente(fn(normalizeAmbiente(a))) : a
          )
        };
        return updatedProject;
      });

      if (updatedProject) syncToFirebase(updatedProject);
      return { projects };
    }),

    addAmbiente: (ambiente) => set((state) => {
      if (!state.activeProjectId) return state;
      const newAmb = normalizeAmbiente({
        paredes: [],
        aberturas: [],
        elementos: [],
        coberturas: [],
        elementosEstructurales: [],
        ...ambiente,
      } as Ambiente);
      
      let updatedProject: Project | null = null;
      const projects = state.projects.map(p => {
        if (p.id === state.activeProjectId) {
          updatedProject = { ...p, ambientes: [...(p.ambientes || []), newAmb], updatedAt: Date.now() };
          return updatedProject;
        }
        return p;
      });

      if (updatedProject) syncToFirebase(updatedProject);
      return { projects, activeAmbienteId: newAmb.id };
    }),

    deleteAmbiente: (id) => set((state) => {
      if (!state.activeProjectId) return state;
      
      const project = state.projects.find(p => p.id === state.activeProjectId);
      if (!project) return state;

      const filtered = project.ambientes.filter(a => a.id !== id);
      const nextAmbientes = filtered.length > 0 ? filtered : [];

      let updatedProject: Project | null = null;
      const projects = state.projects.map(p => {
        if (p.id === state.activeProjectId) {
          updatedProject = { ...p, ambientes: nextAmbientes, updatedAt: Date.now() };
          return updatedProject;
        }
        return p;
      });

      if (updatedProject) syncToFirebase(updatedProject);
      return {
        projects,
        activeAmbienteId: state.activeAmbienteId === id ? (nextAmbientes[0]?.id || null) : state.activeAmbienteId
      };
    }),

    // ─── CAMPAÑAS ───

    addCampania: (projectId, campania) => set((state) => {
      let updatedProject: Project | null = null;
      const projects = state.projects.map(p => {
        if (p.id === projectId) {
          updatedProject = { ...p, updatedAt: Date.now(), campanias: [...(p.campanias || []), campania] };
          return updatedProject;
        }
        return p;
      });
      if (updatedProject) syncToFirebase(updatedProject);
      return { projects };
    }),

    updateCampania: (projectId, campaniaId, patch) => set((state) => {
      let updatedProject: Project | null = null;
      const projects = state.projects.map(p => {
        if (p.id === projectId) {
          updatedProject = {
            ...p,
            updatedAt: Date.now(),
            campanias: (p.campanias || []).map(c =>
              c.id === campaniaId ? { ...c, ...patch } : c
            )
          };
          return updatedProject;
        }
        return p;
      });
      if (updatedProject) syncToFirebase(updatedProject);
      return { projects };
    }),

    closeCampania: (projectId, campaniaId) => set((state) => {
      let updatedProject: Project | null = null;
      const projects = state.projects.map(p => {
        if (p.id === projectId) {
          updatedProject = {
            ...p,
            updatedAt: Date.now(),
            campanias: (p.campanias || []).map(c =>
              c.id === campaniaId ? { ...c, estado: 'cerrada' as const, fechaFin: Date.now() } : c
            )
          };
          return updatedProject;
        }
        return p;
      });
      if (updatedProject) syncToFirebase(updatedProject);
      return { projects };
    }),

    deleteCampania: (projectId, campaniaId) => set((state) => {
      let updatedProject: Project | null = null;
      const projects = state.projects.map(p => {
        if (p.id === projectId) {
          updatedProject = {
            ...p,
            updatedAt: Date.now(),
            campanias: (p.campanias || []).filter(c => c.id !== campaniaId),
            medicionesCampania: (p.medicionesCampania || []).filter(m => m.campaniaId !== campaniaId)
          };
          return updatedProject;
        }
        return p;
      });
      if (updatedProject) syncToFirebase(updatedProject);
      return { projects };
    }),

    // ─── MEDICIONES DE CAMPAÑA ───

    addMedicion: (projectId, medicion) => set((state) => {
      let updatedProject: Project | null = null;
      const projects = state.projects.map(p => {
        if (p.id === projectId) {
          updatedProject = { ...p, updatedAt: Date.now(), medicionesCampania: [...(p.medicionesCampania || []), medicion] };
          return updatedProject;
        }
        return p;
      });
      if (updatedProject) syncToFirebase(updatedProject);
      return { projects };
    }),

    deleteMedicion: (projectId, medicionId) => set((state) => {
      let updatedProject: Project | null = null;
      const projects = state.projects.map(p => {
        if (p.id === projectId) {
          updatedProject = {
            ...p,
            updatedAt: Date.now(),
            medicionesCampania: (p.medicionesCampania || []).filter(m => m.id !== medicionId)
          };
          return updatedProject;
        }
        return p;
      });
      if (updatedProject) syncToFirebase(updatedProject);
      return { projects };
    }),
  })
)
