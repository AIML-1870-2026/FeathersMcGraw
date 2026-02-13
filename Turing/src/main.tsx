import { Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#0a0e14', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
          <div style={{ textAlign: 'center', padding: 32 }}>
            <h1 style={{ color: '#ff4444', marginBottom: 16 }}>Morphogen Error</h1>
            <pre style={{ color: '#ffab00', whiteSpace: 'pre-wrap', maxWidth: 600 }}>{this.state.error}</pre>
            <button onClick={() => window.location.reload()} style={{ marginTop: 24, padding: '8px 16px', background: '#00e5ff', color: '#0a0e14', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
