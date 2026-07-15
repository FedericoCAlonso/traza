import { RelevadorTool } from './ui/relevador/RelevadorTool'
import { SymbolsProvider } from './core/SymbolsContext'
import { useProjectStore } from './store/useProjectStore'
import { DashboardScreen } from './ui/dashboard/DashboardScreen'
import { AuthProvider, useAuth } from './core/AuthContext'
import { LoginScreen } from './ui/auth/LoginScreen'
import { subscribeToProjects } from './lib/firestore'
import { useEffect } from 'react'
import './index.css'

function AppContent() {
  const { user, loading } = useAuth();
  const activeProjectId = useProjectStore(state => state.activeProjectId);
  const setProjects = useProjectStore(state => state.setProjects);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToProjects(user.uid, (projects) => {
        setProjects(projects);
      });
      return () => unsubscribe();
    }
  }, [user, setProjects]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        Cargando...
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <SymbolsProvider>
      {activeProjectId ? <RelevadorTool /> : <DashboardScreen />}
    </SymbolsProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
