import { createContext, useContext } from 'react';
import type { EditorTab } from '../types/index';

interface EditorTabContextValue {
  activeTab: EditorTab;
  setActiveTab: (tab: EditorTab) => void;
}

const EditorTabContext = createContext<EditorTabContextValue | null>(null);

export function EditorTabProvider({
  activeTab,
  setActiveTab,
  children,
}: {
  activeTab: EditorTab;
  setActiveTab: (tab: EditorTab) => void;
  children: React.ReactNode;
}) {
  return (
    <EditorTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </EditorTabContext.Provider>
  );
}

export function useEditorTab(): EditorTabContextValue {
  const ctx = useContext(EditorTabContext);
  if (!ctx) {
    throw new Error('useEditorTab debe usarse dentro de <EditorTabProvider>');
  }
  return ctx;
}
