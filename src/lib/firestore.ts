import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { Project } from '../types/index';
import { normalizeProject } from '../store/useProjectStore';

// Colección raíz para usuarios
export const getUserProjectsRef = (userId: string) => collection(db, 'users', userId, 'projects');
export const getProjectDoc = (userId: string, projectId: string) => doc(db, 'users', userId, 'projects', projectId);

// Elimina todas las propiedades 'undefined' de un objeto de forma recursiva
// porque Firestore no soporta valores undefined, solo null.
function removeUndefined(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefined);
  
  const newObj: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      newObj[key] = removeUndefined(obj[key]);
    }
  }
  return newObj;
}

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
  const cleanProject = removeUndefined(project);
  // Guardamos todo el objeto completo
  await setDoc(ref, cleanProject);
}

/**
 * Elimina un proyecto en Firestore.
 */
export async function removeProject(userId: string, projectId: string) {
  const ref = getProjectDoc(userId, projectId);
  await deleteDoc(ref);
}
