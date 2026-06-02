import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import Gerencial from './pages/Gerencial.jsx'
import Loja from './pages/Loja.jsx'
import PerformanceDarkstore from './pages/PerformanceDarkstore.jsx'
import FeedbacksPage from './pages/FeedbacksPage.jsx'
import LoginPage from './LoginPage.jsx'

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('intraday_user') || 'null')
  } catch {
    return null
  }
}

// Set header immediately before first render so API calls on mount are authenticated
const _storedToken = localStorage.getItem('intraday_token')
if (_storedToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${_storedToken}`
}

export default function IntradayApp() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('intraday_token')
    return token ? getStoredUser() : null
  })
  const [nav, setNav] = useState({ pagina: 'gerencial' })

  const handleLogout = useCallback(() => {
    localStorage.removeItem('intraday_token')
    localStorage.removeItem('intraday_user')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }, [])

  // Intercept 401 responses globally and force re-login
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401) handleLogout()
        return Promise.reject(err)
      }
    )
    return () => axios.interceptors.response.eject(interceptor)
  }, [handleLogout])

  function handleLogin(data) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setUser({ name: data.name, email: data.email, picture: data.picture })
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  function irParaLoja(loja, dataInicio, dataFim) {
    setNav({ pagina: 'loja', loja, dataInicio, dataFim })
  }

  function irParaGerencial() {
    setNav({ pagina: 'gerencial' })
  }

  function irParaPerformance() {
    setNav({ pagina: 'performance' })
  }

  function irParaFeedbacks() {
    setNav({ pagina: 'feedbacks' })
  }

  if (nav.pagina === 'loja') {
    return (
      <Loja
        loja={nav.loja}
        dataInicio={nav.dataInicio}
        dataFim={nav.dataFim}
        onVoltar={irParaGerencial}
        user={user}
        onLogout={handleLogout}
      />
    )
  }

  if (nav.pagina === 'feedbacks') {
    return (
      <FeedbacksPage
        onVoltar={irParaGerencial}
        user={user}
      />
    )
  }

  if (nav.pagina === 'performance') {
    return (
      <PerformanceDarkstore
        onVoltar={irParaGerencial}
        user={user}
        onLogout={handleLogout}
      />
    )
  }

  return <Gerencial onLojaClick={irParaLoja} onPerformanceClick={irParaPerformance} onFeedbacksClick={irParaFeedbacks} user={user} onLogout={handleLogout} />
}
