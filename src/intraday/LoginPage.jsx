import { useEffect, useState } from 'react'

const CLIENT_ID = '71212774978-ugghriru7tudv5o7tlvehs0lqvlcgmfa.apps.googleusercontent.com'
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const IS_DEV = import.meta.env.DEV

export default function LoginPage({ onLogin }) {
  const [devEmail, setDevEmail] = useState('')
  const [devLoading, setDevLoading] = useState(false)

  async function handleDevLogin() {
    if (!devEmail) return
    setDevLoading(true)
    try {
      const res = await fetch(`${API}/api/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: devEmail }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.erro || 'Erro'); return }
      localStorage.setItem('intraday_token', data.token)
      localStorage.setItem('intraday_user', JSON.stringify({ name: data.name, email: data.email, picture: data.picture, store_code: data.store_code ?? null, nome: data.nome ?? null, fun_o: data.fun_o ?? null, is_admin: data.is_admin ?? false }))
      onLogin(data)
    } finally { setDevLoading(false) }
  }

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredential,
      })
      window.google.accounts.id.renderButton(
        document.getElementById('google-btn'),
        { theme: 'outline', size: 'large', text: 'signin_with', locale: 'pt-BR' }
      )
    }
    document.head.appendChild(script)
  }, [])

  async function handleCredential(response) {
    try {
      const res = await fetch(`${API}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.erro || 'Erro ao autenticar.')
        return
      }
      localStorage.setItem('intraday_token', data.token)
      localStorage.setItem('intraday_user', JSON.stringify({ name: data.name, email: data.email, picture: data.picture, store_code: data.store_code ?? null, nome: data.nome ?? null, fun_o: data.fun_o ?? null, is_admin: data.is_admin ?? false }))
      onLogin(data)
    } catch {
      alert('Erro de conexão com o servidor.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="/shopper-icon.avif" alt="Shopper" className="login-logo" />
        <div className="login-title">INTRADAY</div>
        <div className="login-subtitle">Performance Operacional</div>
        <p className="login-info">Use sua conta <strong>@shopper.com.br</strong> para acessar</p>
        <div id="google-btn" className="login-google-btn" />
        {IS_DEV && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dev — login direto</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="email"
                placeholder="email@shopper.com.br"
                value={devEmail}
                onChange={e => setDevEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDevLogin()}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
              />
              <button
                onClick={handleDevLogin}
                disabled={devLoading || !devEmail}
                style={{ padding: '6px 14px', borderRadius: 6, background: '#334155', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: devLoading ? 0.6 : 1 }}
              >
                {devLoading ? '...' : 'Entrar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
