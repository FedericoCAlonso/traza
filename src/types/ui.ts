export type EditorTab = 'resumen' | 'general' | 'hoja' | 'paredes' | 'aberturas' | 'escaleras' | 'electrico' | 'circuitos' | 'conexiones' | 'mediciones' | 'maestro' | 'cobertura';


export type ScreenView = 'projects' | 'editor';

import type { ElementoElectrico } from './project';

export type SymbolDialogData =
  | { mode: 'edit'; existing: ElementoElectrico }
  | { mode: 'create'; x: number; y: number; snapSegIdx?: number; snapPos?: number; snapLado?: 'interior' | 'exterior' };

export type SelectedElement =
  | { type: 'pared';    idx: number }
  | { type: 'abertura'; id: string  }
  | { type: 'elemento'; id: string  }
  | null;
