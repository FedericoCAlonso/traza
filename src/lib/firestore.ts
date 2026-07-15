import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { Project } from '../types/index';
import { normalizeProject } from '../store/useProjectStore';

// Colección raíz para usuarios
export const getUserProjectsRef = (userId: string) => collection(db, 'users', userId, 'projects');
export const getProjectDoc = (userId: string, projectId: string) => doc(db, 'users', userId, 'projects', projectId);

/**
 * Suscribe a los cambios de proyectos de un usuario y llama al callback con la lista actualizada.
 */
export function subscribeToProjects(userId: string, onUpdate: (projects: Project[]) => void) {
  const ref = getUserProjectsRef(userId);
  return onSnapshot(ref, (snapshot) => {
    const projects: Project[] = [];
    snapshot.forEach(doc => {
      projects.push(normalizeProject(doc.data() as Project));
    });
    onUpdate(projects);
  }, (error) => {
    console.error("Error al suscribirse a los proyectos:", error);
  });
}

/**
 * Guarda o actualiza un proyecto completo en Firestore.
 */
export async function saveProject(userId: string, project: Project) {
  const ref = getProjectDoc(userId, project.id);
  // Guardamos todo el objeto completo (en producción podríamos usar updateDoc para campos específicos y ahorrar ancho de banda, pero para empezar setDoc está perfecto)
  await setDoc(ref, project);
}

/**
 * Elimina un proyecto en Firestore.
 */
export async function removeProject(userId: string, projectId: string) {
  const ref = getProjectDoc(userId, projectId);
  await deleteDoc(ref);
}
