import { useEffect } from 'react'

const CLIENT_ID = '71212774978-ugghriru7tudv5o7tlvehs0lqvlcgmfa.apps.googleusercontent.com'
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function LoginPage({ onLogin }) {
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
      localStorage.setItem('intraday_user', JSON.stringify({ name: data.name, email: data.email, picture: data.picture }))
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
      </div>
    </div>
  )
}
