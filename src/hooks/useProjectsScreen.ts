import { useRef } from 'react';

/**
 * Custom Hook que encapsula la lógica de interacción con archivos para la pantalla de proyectos.
 */
export function useProjectsScreen(onImport: (data: any) => void) {
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * Dispara el clic en el input de archivo oculto.
   */
  const handleImportClick = () => {
    fileRef.current?.click();
  };

  /**
   * Procesa la lectura del archivo JSON seleccionado.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (typeof content === 'string') {
          const parsed = JSON.parse(content);
          onImport(parsed);
        }
      } catch (err) {
        console.error("Error al importar el proyecto:", err);
        alert("El archivo no es un JSON de proyecto válido.");
      }
    };
    
    reader.readAsText(file);
    
    // Limpiamos el valor para permitir importar el mismo archivo consecutivamente si es necesario
    e.target.value = '';
  };

  return {
    fileRef,
    handleImportClick,
    handleFileChange
  };
}
