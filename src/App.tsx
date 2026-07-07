import { RelevadorTool } from './ui/relevador/RelevadorTool'
import { SymbolsProvider } from './core/SymbolsContext'
import './index.css'

function App() {
  return (
    <SymbolsProvider>
      <RelevadorTool />
    </SymbolsProvider>
  )
}

export default App
