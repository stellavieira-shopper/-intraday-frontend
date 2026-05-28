import { useState, useEffect } from 'react'
import axios from 'axios'
import Gerencial from './pages/Gerencial.jsx'
import Loja from './pages/Loja.jsx'
import LoginPage from './LoginPage.jsx'

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('intraday_user') || 'null')
  } catch {
    return null
  }
}

export default function IntradayApp() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('intraday_token')
    return token ? getStoredUser() : null
  })
  const [nav, setNav] = useState({ pagina: 'gerencial' })

  useEffect(() => {
    const token = localStorage.getItem('intraday_token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [user])

  function handleLogin(data) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setUser({ name: data.name, email: data.email, picture: data.picture })
  }

  function handleLogout() {
    localStorage.removeItem('intraday_token')
    localStorage.removeItem('intraday_user')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
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

  return <Gerencial onLojaClick={irParaLoja} user={user} onLogout={handleLogout} />
}
