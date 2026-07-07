import { useState, useCallback } from 'react';
import type { SymbolDialogData, ScreenView, EditorTab } from '../types/index';

export function useUIState() {
  const [screen, setScreen] = useState<ScreenView>('projects');
  const [mobileEditorVisible, setMobileEditorVisible] = useState(true);
  const [activeTab, setActiveTabRaw] = useState<EditorTab>('general'); 
  const [pendingConnectionStart, setPendingConnectionStart] = useState<string | null>(null);
  
  // Modales
  const [symDialog, setSymDialog] = useState<SymbolDialogData | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showSymbolManager, setShowSymbolManager] = useState(false);
  const [showNetlist, setShowNetlist] = useState(false);

  const toggleMobileEditor = useCallback(() => setMobileEditorVisible(prev => !prev), []);
  
  const openEditor = useCallback((visible = true) => {
    setScreen('editor');
    setMobileEditorVisible(visible);
  }, []);

  const closeEditor = useCallback(() => {
    setScreen('projects');
  }, []);

  const setActiveTab = useCallback((tab: EditorTab) => {
    if (tab !== 'conexiones') {
      setPendingConnectionStart(null);
    }
    setActiveTabRaw(tab);
  }, []);

  return {
    screen, setScreen,
    mobileEditorVisible, setMobileEditorVisible, toggleMobileEditor,
    openEditor, closeEditor,
    activeTab, setActiveTab,
    pendingConnectionStart, setPendingConnectionStart,
    modals: {
      symDialog, setSymDialog,
      showExport, setShowExport,
      showSymbolManager, setShowSymbolManager,
      showNetlist, setShowNetlist,
    }
  };
}
