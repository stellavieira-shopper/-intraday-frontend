import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import HubPage from './pages/HubPage.jsx'
import Gerencial from './pages/Gerencial.jsx'
import Loja from './pages/Loja.jsx'
import PerformanceDarkstore from './pages/PerformanceDarkstore.jsx'
import FeedbacksPage from './pages/FeedbacksPage.jsx'
import MeuDesempenhoPage from './pages/MeuDesempenhoPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import LoginPage from './LoginPage.jsx'

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('intraday_user') || 'null') } catch { return null }
}

const _storedToken = localStorage.getItem('intraday_token')
if (_storedToken) axios.defaults.headers.common['Authorization'] = `Bearer ${_storedToken}`

export default function IntradayApp() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('intraday_token')
    return token ? getStoredUser() : null
  })
  const [nav, setNav] = useState({ pagina: 'hub' })

  const handleLogout = useCallback(() => {
    localStorage.removeItem('intraday_token')
    localStorage.removeItem('intraday_user')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
    setNav({ pagina: 'hub' })
  }, [])

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      res => res,
      err => { if (err.response?.status === 401) handleLogout(); return Promise.reject(err) }
    )
    return () => axios.interceptors.response.eject(interceptor)
  }, [handleLogout])

  function handleLogin(data) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    const userData = { name: data.name, email: data.email, picture: data.picture, store_code: data.store_code ?? null, nome: data.nome ?? null, fun_o: data.fun_o ?? null }
    localStorage.setItem('intraday_user', JSON.stringify(userData))
    setUser(userData)
    setNav({ pagina: 'hub' })
  }

  if (!user) return <LoginPage onLogin={handleLogin} />

  if (nav.pagina === 'hub') {
    return (
      <HubPage
        user={user}
        onIntraday={() => setNav({ pagina: 'gerencial' })}
        onFeedbacks={() => setNav({ pagina: 'feedbacks' })}
        onMeuDesempenho={() => setNav({ pagina: 'meu-desempenho' })}
        onAdmin={() => setNav({ pagina: 'admin' })}
        onLogout={handleLogout}
      />
    )
  }

  if (nav.pagina === 'admin') {
    return (
      <AdminPage
        user={user}
        onVoltar={() => setNav({ pagina: 'hub' })}
        onLogout={handleLogout}
      />
    )
  }

  if (nav.pagina === 'meu-desempenho') {
    return (
      <MeuDesempenhoPage
        user={user}
        onVoltar={() => setNav({ pagina: 'hub' })}
        onLogout={handleLogout}
      />
    )
  }

  if (nav.pagina === 'loja') {
    return (
      <Loja
        loja={nav.loja}
        dataInicio={nav.dataInicio}
        dataFim={nav.dataFim}
        onVoltar={() => setNav({ pagina: 'gerencial' })}
        user={user}
        onLogout={handleLogout}
      />
    )
  }

  if (nav.pagina === 'feedbacks') {
    return (
      <FeedbacksPage
        onVoltar={() => setNav({ pagina: 'hub' })}
        user={user}
        onLogout={handleLogout}
      />
    )
  }

  // default: gerencial
  return (
    <Gerencial
      onLojaClick={(loja, dataInicio, dataFim) => setNav({ pagina: 'loja', loja, dataInicio, dataFim })}
      onVoltar={() => setNav({ pagina: 'hub' })}
      user={user}
      onLogout={handleLogout}
    />
  )
}
