// src/hooks/useProjectInstallacion.ts
import { useCallback } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { generateId } from '../lib/storage'
import type { Circuito, Tablero, Project } from '../types/index'

export function useProjectInstallation() {
  const { projects, activeProjectId, updateProject } = useProjectStore()
  const activeProject = projects.find(p => p.id === activeProjectId)

  const tableros = activeProject?.tableros || []
  const circuitos = activeProject?.circuitos || []

  const addTablero = useCallback((data: Omit<Tablero, 'id'>) => {
    if (!activeProject) throw new Error('No hay proyecto activo')
    const nuevo: Tablero = { id: generateId(), ...data }
    updateProject(activeProject.id, (p: Project) => ({
      ...p,
      tableros: [...(p.tableros || []), nuevo],
      updatedAt: Date.now()
    }))
    return nuevo
  }, [activeProject, updateProject])

  const addCircuito = useCallback((data: Omit<Circuito, 'id'>) => {
    if (!activeProject) throw new Error('No hay proyecto activo')
    const nuevo: Circuito = { id: generateId(), ...data }
    updateProject(activeProject.id, (p: Project) => ({
      ...p,
      circuitos: [...(p.circuitos || []), nuevo],
      updatedAt: Date.now()
    }))
    return nuevo
  }, [activeProject, updateProject])

  const updateCircuito = useCallback((id: string, data: Partial<Circuito>) => {
    if (!activeProject) throw new Error('No hay proyecto activo')
    updateProject(activeProject.id, (p: Project) => ({
      ...p,
      circuitos: (p.circuitos || []).map((c: Circuito) => c.id === id ? { ...c, ...data } : c),
      updatedAt: Date.now()
    }))
  }, [activeProject, updateProject])

  const updateTablero = useCallback((id: string, data: Partial<Tablero>) => {
    if (!activeProject) throw new Error('No hay proyecto activo')
    updateProject(activeProject.id, (p: Project) => ({
      ...p,
      tableros: (p.tableros || []).map((t: Tablero) => t.id === id ? { ...t, ...data } : t),
      updatedAt: Date.now()
    }))
  }, [activeProject, updateProject])

  const deleteTablero = useCallback((id: string) => {
    if (!activeProject) throw new Error('No hay proyecto activo')
    updateProject(activeProject.id, (p: Project) => ({
      ...p,
      tableros: (p.tableros || []).filter((t: Tablero) => t.id !== id),
      circuitos: (p.circuitos || []).map((c: Circuito) => c.tableroId === id ? { ...c, tableroId: '' } : c),
      updatedAt: Date.now()
    }))
  }, [activeProject, updateProject])

  const deleteCircuito = useCallback((id: string) => {
    if (!activeProject) throw new Error('No hay proyecto activo')
    updateProject(activeProject.id, (p: Project) => ({
      ...p,
      circuitos: (p.circuitos || []).filter((c: Circuito) => c.id !== id),
      updatedAt: Date.now()
    }))
  }, [activeProject, updateProject])

  return {
    tableros,
    circuitos,
    addTablero,
    addCircuito,
    updateTablero,
    updateCircuito,
    deleteTablero,
    deleteCircuito
  }
}