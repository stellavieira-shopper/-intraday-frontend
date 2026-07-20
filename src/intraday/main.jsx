import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './intraday.css'
import IntradayApp from './IntradayApp.jsx'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', color: '#b91c1c', background: '#fff1f2', minHeight: '100vh' }}>
          <strong style={{ fontSize: 18 }}>Erro React:</strong>
          <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap', fontSize: 13 }}>{this.state.error?.stack || String(this.state.error)}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('intraday-root')).render(
  <StrictMode>
    <ErrorBoundary>
      <IntradayApp />
    </ErrorBoundary>
  </StrictMode>,
)
