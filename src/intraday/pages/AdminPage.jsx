import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || ''

function weekLabel(year, week) {
  return `W${String(week).padStart(2, '0')} / ${year}`
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

export default function AdminPage({ user, onVoltar, onLogout }) {
  const [semanas, setSemanas]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [erro, setErro]             = useState(null)
  const [toggling, setToggling]     = useState(null)
  const [histInicio, setHistInicio] = useState('')
  const [histFim, setHistFim]       = useState('')
  const [histLoading, setHistLoading] = useState(false)
  const [histMsg, setHistMsg]       = useState(null)

  const firstName = user?.name?.split(' ')[0] || ''

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const { data } = await axios.get(`${API}/api/admin/semanas`)
      setSemanas(data.semanas || [])
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao carregar semanas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function handleRefreshHistorico() {
    if (!histInicio || !histFim) return alert('Preencha as duas datas.')
    setHistLoading(true)
    setHistMsg(null)
    try {
      await axios.post(`${API}/api/admin/refresh-historico`, { data_inicio: histInicio, data_fim: histFim })
      setHistMsg({ ok: true, text: `Histórico de ${histInicio} até ${histFim} reprocessado.` })
    } catch (e) {
      setHistMsg({ ok: false, text: e.response?.data?.erro || 'Erro ao reprocessar.' })
    } finally {
      setHistLoading(false)
    }
  }

  async function handleToggle(semana) {
    setToggling(semana.week_key)
    try {
      const { data } = await axios.post(`${API}/api/admin/semanas/toggle`, {
        year_ref: semana.year_ref,
        week_ref: semana.week_ref,
      })
      setSemanas(prev => prev.map(s =>
        s.week_key === data.week_key
          ? { ...s, liberada: data.liberada, updated_by: user.email, updated_at: new Date().toISOString() }
          : s
      ))
    } catch (e) {
      alert(e.response?.data?.erro || 'Erro ao alterar semana.')
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="intraday-layout">
      <div className="intraday-topbar">
        <div className="intraday-topbar__brand">
          <img src="/shopper-icon.avif" alt="Shopper" className="topbar-icon" />
          <div className="brand-divider" />
          <div>
            <div className="brand-label">SHOPPER</div>
            <div className="brand-title">Administração</div>
          </div>
        </div>
        <div className="intraday-topbar__right">
          <div className="topbar-user">
            {user?.picture && (
              <img src={user.picture} alt={user.name} className="topbar-avatar" referrerPolicy="no-referrer" />
            )}
            <span className="topbar-username">{firstName}</span>
            <button className="btn-logout" onClick={onVoltar}>← Voltar</button>
            <button className="btn-logout" onClick={onLogout}>Sair</button>
          </div>
        </div>
      </div>

      <div className="intraday-content" style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.25rem', color: '#1a1a2e' }}>
          Reprocessar histórico de pedidos
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
          O refresh automático atualiza apenas os últimos 2 dias. Use isso para reprocessar pedidos de semanas passadas (pedidos que estavam EM_ANDAMENTO e já finalizaram).
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Data início</label>
            <input type="date" value={histInicio} onChange={e => setHistInicio(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '0.4rem 0.7rem', fontSize: '0.875rem' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Data fim</label>
            <input type="date" value={histFim} onChange={e => setHistFim(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '0.4rem 0.7rem', fontSize: '0.875rem' }} />
          </div>
          <button onClick={handleRefreshHistorico} disabled={histLoading}
            style={{ padding: '0.45rem 1rem', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: '#1a1a2e', color: '#fff', fontWeight: 600, fontSize: '0.8125rem',
              opacity: histLoading ? 0.5 : 1 }}>
            {histLoading ? 'Reprocessando…' : 'Reprocessar'}
          </button>
        </div>
        {histMsg && (
          <div style={{ padding: '0.625rem 1rem', borderRadius: 7, fontSize: '0.875rem', marginBottom: '1.5rem',
            background: histMsg.ok ? '#dcfce7' : '#fef2f2',
            color: histMsg.ok ? '#15803d' : '#dc2626',
            border: `1px solid ${histMsg.ok ? '#86efac' : '#fecaca'}` }}>
            {histMsg.text}
          </div>
        )}

        <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.25rem', color: '#1a1a2e' }}>
          Liberação de semanas
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
          Semanas novas ficam bloqueadas por padrão. Libere aqui para que os colaboradores
          consigam visualizar o feedback no Intraday.
        </p>

        {loading && (
          <div style={{ color: '#64748b', textAlign: 'center', padding: '3rem 0' }}>Carregando…</div>
        )}

        {erro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
            padding: '0.875rem 1rem', color: '#dc2626', fontSize: '0.875rem' }}>
            {erro}
          </div>
        )}

        {!loading && !erro && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {semanas.length === 0 && (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>
                Nenhuma semana encontrada no mart.
              </div>
            )}
            {semanas.map(s => (
              <div key={s.week_key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                padding: '1rem 1.25rem', gap: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: s.liberada ? '#dcfce7' : '#f1f5f9',
                    color: s.liberada ? '#16a34a' : '#94a3b8',
                    fontSize: '1.1rem',
                  }}>
                    {s.liberada ? '✓' : '⏸'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#1e293b' }}>
                      {weekLabel(s.year_ref, s.week_ref)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                      {s.updated_by
                        ? `Atualizado por ${s.updated_by.split('@')[0]} em ${fmtDate(s.updated_at)}`
                        : 'Nunca configurado'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.625rem',
                    borderRadius: 20, letterSpacing: '0.02em',
                    background: s.liberada ? '#dcfce7' : '#fef3c7',
                    color:      s.liberada ? '#15803d' : '#92400e',
                  }}>
                    {s.liberada ? 'Liberada' : 'Bloqueada'}
                  </span>
                  <button
                    onClick={() => handleToggle(s)}
                    disabled={toggling === s.week_key}
                    style={{
                      padding: '0.4rem 0.9rem', borderRadius: 7, border: 'none', cursor: 'pointer',
                      fontWeight: 600, fontSize: '0.8125rem', transition: 'opacity 0.15s',
                      opacity: toggling === s.week_key ? 0.5 : 1,
                      background: s.liberada ? '#fee2e2' : '#16a34a',
                      color:      s.liberada ? '#dc2626' : '#fff',
                    }}
                  >
                    {toggling === s.week_key ? '…' : s.liberada ? 'Bloquear' : 'Liberar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
