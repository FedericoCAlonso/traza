import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import localforage from 'localforage'
import type { Project, Ambiente } from '../types/index'
import type { Campania, MedicionCampania } from '../types/measurements'

localforage.config({
  name: 'TrazaApp',
  storeName: 'projects_store'
})

const storage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await localforage.getItem(name)) || null
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await localforage.setItem(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    await localforage.removeItem(name)
  }
}

/**
 * Garantiza que todos los arrays opcionales de un Ambiente siempre existan.
 * Esencial para migrar datos viejos cargados desde IndexedDB.
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
  selectProject: (id: string) => void
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

export const useProjectStore = create<ProjectState>()(
  persist(

    (set) => ({
      projects: [],
      activeProjectId: null,
      activeAmbienteId: null,

      setProjects: (projects) => set({ projects: projects.map(normalizeProject) }),
      
      addProject: (project) => set((state) => ({ 
        projects: [...state.projects, normalizeProject(project)] 
      })),
      
      selectProject: (id) => set((state) => {
        const p = state.projects.find(x => x.id === id)
        return {
          activeProjectId: id,
          activeAmbienteId: p?.ambientes?.[0]?.id || null
        }
      }),

      updateProject: (id, fn) => set((state) => ({
        projects: state.projects.map(p => 
          p.id === id ? normalizeProject({ ...fn(p), updatedAt: Date.now() }) : p
        )
      })),

      deleteProject: (id) => set((state) => ({
        projects: state.projects.filter(p => p.id !== id),
        activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        activeAmbienteId: state.activeProjectId === id ? null : state.activeAmbienteId
      })),

      setActiveAmbienteId: (id) => set({ activeAmbienteId: id }),

      updateAmbiente: (fn) => set((state) => {
        if (!state.activeProjectId || !state.activeAmbienteId) return state
        
        return {
          projects: state.projects.map(p => {
            if (p.id !== state.activeProjectId) return p
            return {
              ...p,
              updatedAt: Date.now(),
              ambientes: p.ambientes.map(a => 
                a.id === state.activeAmbienteId ? normalizeAmbiente(fn(normalizeAmbiente(a))) : a
              )
            }
          })
        }
      }),

      addAmbiente: (ambiente) => set((state) => {
        if (!state.activeProjectId) return state
        const newAmb = normalizeAmbiente({
          paredes: [],
          aberturas: [],
          elementos: [],
          coberturas: [],
          elementosEstructurales: [],
          ...ambiente,
        } as Ambiente)
        return {
          projects: state.projects.map(p => 
            p.id === state.activeProjectId 
              ? { ...p, ambientes: [...(p.ambientes || []), newAmb] }
              : p
          ),
          activeAmbienteId: newAmb.id
        }
      }),

      deleteAmbiente: (id) => set((state) => {
        if (!state.activeProjectId) return state
        
        const project = state.projects.find(p => p.id === state.activeProjectId)
        if (!project) return state

        const filtered = project.ambientes.filter(a => a.id !== id)
        const nextAmbientes = filtered.length > 0 ? filtered : []

        return {
          projects: state.projects.map(p => 
            p.id === state.activeProjectId 
              ? { ...p, ambientes: nextAmbientes }
              : p
          ),
          activeAmbienteId: state.activeAmbienteId === id ? (nextAmbientes[0]?.id || null) : state.activeAmbienteId
        }
      }),

      // ─── CAMPAÑAS ───

      addCampania: (projectId, campania) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, updatedAt: Date.now(), campanias: [...(p.campanias || []), campania] }
            : p
        )
      })),

      updateCampania: (projectId, campaniaId, patch) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === projectId
            ? {
                ...p,
                updatedAt: Date.now(),
                campanias: (p.campanias || []).map(c =>
                  c.id === campaniaId ? { ...c, ...patch } : c
                )
              }
            : p
        )
      })),

      closeCampania: (projectId, campaniaId) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === projectId
            ? {
                ...p,
                updatedAt: Date.now(),
                campanias: (p.campanias || []).map(c =>
                  c.id === campaniaId
                    ? { ...c, estado: 'cerrada' as const, fechaFin: Date.now() }
                    : c
                )
              }
            : p
        )
      })),

      deleteCampania: (projectId, campaniaId) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === projectId
            ? {
                ...p,
                updatedAt: Date.now(),
                campanias: (p.campanias || []).filter(c => c.id !== campaniaId),
                medicionesCampania: (p.medicionesCampania || []).filter(m => m.campaniaId !== campaniaId)
              }
            : p
        )
      })),

      // ─── MEDICIONES DE CAMPAÑA ───

      addMedicion: (projectId, medicion) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, updatedAt: Date.now(), medicionesCampania: [...(p.medicionesCampania || []), medicion] }
            : p
        )
      })),

      deleteMedicion: (projectId, medicionId) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === projectId
            ? {
                ...p,
                updatedAt: Date.now(),
                medicionesCampania: (p.medicionesCampania || []).filter(m => m.id !== medicionId)
              }
            : p
        )
      })),
    }),
    {
      name: 'traza-storage',
      storage: createJSONStorage(() => storage),
      // Al rehidratar desde IndexedDB, normalizar todos los proyectos
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.projects = state.projects.map(normalizeProject)
        }
      }
    }
  )
)
