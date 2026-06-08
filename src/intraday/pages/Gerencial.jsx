import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import LojaCard from '../components/LojaCard.jsx'
import DateFilter from '../components/DateFilter.jsx'
import { calcSaude } from '../components/StatusBadge.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function hoje() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

function fmtPct(num, den) {
  if (!den || den === 0) return '—'
  return `${Math.round((num / den) * 100)}%`
}

function fmtPeriodo(ini, fim) {
  const fmt = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
  return ini === fim ? fmt(ini) : `${fmt(ini)} → ${fmt(fim)}`
}

function slaLoja(l) {
  const comSla = Number(l.pedidos_com_sla) || 0
  const dentroSla = Number(l.pedidos_dentro_sla) || 0
  return comSla > 0 ? dentroSla / comSla : 1
}

// Home icon
function HomeIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

// Check icon
function CheckIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// LogOut icon
function LogOutIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export default function Gerencial({ onLojaClick, onVoltar, user, onLogout }) {
  const [dataInicio, setDataInicio] = useState(hoje())
  const [dataFim, setDataFim]       = useState(hoje())
  const [lojas, setLojas]           = useState([])
  const [loading, setLoading]       = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [bqRefreshing, setBqRefreshing] = useState(false)
  const [fromCache, setFromCache]   = useState(false)
  const [erro, setErro]             = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Poll BQ refresh status
  useEffect(() => {
    let active = true
    const poll = async () => {
      try {
        const { data } = await axios.get(`${API}/api/intraday/status`)
        if (active) setBqRefreshing(!!data.refreshing)
      } catch (_) {}
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => { active = false; clearInterval(id) }
  }, [])

  function handleDateChange({ dataInicio: ini, dataFim: fim }) {
    setDataInicio(ini)
    setDataFim(fim)
    setAutoRefresh(ini === hoje() && fim === hoje())
  }

  const buscar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const { data: resp } = await axios.get(`${API}/api/intraday/gerencial`, {
        params: { data_inicio: dataInicio, data_fim: dataFim }
      })
      const sorted = (resp.lojas || []).sort((a, b) => slaLoja(a) - slaLoja(b))
      setLojas(sorted)
      setFromCache(!!resp.fromCache)
      setBqRefreshing(!!resp.refreshing)
    } catch (e) {
      setErro(e.response?.data?.erro || e.message || 'Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [dataInicio, dataFim])

  async function handleAtualizar() {
    setRefreshing(true)
    setErro(null)
    try {
      await axios.post(`${API}/api/intraday/refresh`)
      await buscar()
    } catch (e) {
      setErro(e.response?.data?.erro || e.message || 'Erro ao atualizar tabela.')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => { buscar() }, [buscar])

  const buscarRef = useRef(buscar)
  useEffect(() => { buscarRef.current = buscar }, [buscar])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => {
      if (!refreshing) buscarRef.current()
    }, 60_000)
    return () => clearInterval(id)
  }, [autoRefresh, refreshing])

  const saudes    = lojas.map(calcSaude)
  const criticos  = saudes.filter(s => s.variant === 'critico').length
  const atencao   = saudes.filter(s => s.variant === 'atencao').length
  const saudaveis = saudes.filter(s => s.variant === 'saudavel').length
  const firstName = user?.name?.split(' ')[0] || ''

  return (
    <div className="intraday-layout">
      {/* V1-style topbar */}
      <div className="top-bar">
        <img src="/shopper-icon.avif" alt="Shopper" className="top-bar-logo-img" />
        <div className="top-bar-divider" />
        <div className="top-bar-context">
          <span className="top-bar-eyebrow">Intraday</span>
          <span className="top-bar-store">Performance Operacional</span>
        </div>
        <div className="top-bar-spacer" />
        <button
          className="top-bar-logout"
          onClick={onVoltar}
          title="Voltar ao menu"
          style={{ marginRight: 8 }}
        >
          <HomeIcon />
          <span className="top-bar-logout-text">Menu</span>
        </button>
        <button
          onClick={handleAtualizar}
          disabled={loading || refreshing || bqRefreshing}
          title={bqRefreshing ? 'Aguarde — atualização em andamento' : 'Atualizar dados'}
          style={{
            padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700,
            background: 'var(--shopper-navy)', color: '#fff', border: 'none', cursor: 'pointer',
            opacity: (loading || refreshing || bqRefreshing) ? 0.5 : 1, transition: 'opacity .15s',
            fontFamily: 'inherit',
          }}
        >
          {refreshing ? '⏳ Atualizando...' : (loading && lojas.length > 0) ? '⏳' : '↺ Atualizar'}
        </button>
        {user && (
          <div className="top-bar-user">
            {user.picture && (
              <img src={user.picture} alt={user.name} className="top-bar-avatar" referrerPolicy="no-referrer" />
            )}
            <span className="top-bar-username">{firstName}</span>
            <button className="top-bar-logout" onClick={onLogout} title="Sair">
              <LogOutIcon />
              <span className="top-bar-logout-text">Sair</span>
            </button>
          </div>
        )}
      </div>

      {/* BQ refresh warning */}
      {bqRefreshing && (
        <div style={{
          background: '#fff3cd', borderBottom: '2px solid #f39c12',
          padding: '10px 32px', display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 13, fontWeight: 600, color: '#856404'
        }}>
          <span style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>⟳</span>
          Atualizando dados em tempo real — os dados exibidos estão congelados até a atualização ser concluída.
        </div>
      )}

      {/* DateFilter bar — replaces the full datebar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid var(--border-1)',
        padding: '10px 32px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {autoRefresh ? (
            <span className="auto-refresh-chip">
              <CheckIcon /> Atualização automática de minuto em minuto ligada
            </span>
          ) : (
            <span className="auto-refresh-chip auto-refresh-chip-off">
              Atualização automática desligada
            </span>
          )}
        </div>
        <DateFilter dataInicio={dataInicio} dataFim={dataFim} onChange={handleDateChange} />
      </div>

      <div className="intraday-content">
        {erro && <div className="error-banner">⚠ {erro}</div>}

        {/* Status mini-cards */}
        <div className="status-bar">
          <div className="status-bar__item status-bar__item--critico">
            <span className="status-bar__num">{criticos}</span>
            <span className="status-bar__lbl">Crítico</span>
          </div>
          <div className="status-bar__item status-bar__item--atencao">
            <span className="status-bar__num">{atencao}</span>
            <span className="status-bar__lbl">Atenção</span>
          </div>
          <div className="status-bar__item status-bar__item--saudavel">
            <span className="status-bar__num">{saudaveis}</span>
            <span className="status-bar__lbl">Saudável</span>
          </div>
          <div className="status-bar__divider" />
          <div className="status-bar__item">
            <span className="status-bar__num">{lojas.length}</span>
            <span className="status-bar__lbl">Lojas Ativas</span>
          </div>
        </div>

        {loading && lojas.length === 0 && (
          <div className="loading-state">
            <div className="spinner" /><span>Carregando dados...</span>
          </div>
        )}

        {!loading && lojas.length === 0 && !erro && (
          <div className="empty-state empty-state--full">
            Nenhuma loja encontrada para {fmtPeriodo(dataInicio, dataFim)}.
            <div style={{ fontSize: '.85rem', marginTop: 8, opacity: .6 }}>
              Nenhum pedido finalizado encontrado para este período.
            </div>
          </div>
        )}

        {lojas.length > 0 && (
          <>
            {/* Visão Gerencial header */}
            <div className="gerencial-section-header">
              <div className="gerencial-section-eyebrow">Visão Gerencial</div>
              <div className="gerencial-section-title">{lojas.length} loja{lojas.length !== 1 ? 's' : ''} em operação</div>
              <p className="gerencial-section-sub">Toque em uma loja para abrir a visão de supervisor</p>
            </div>

            <section className="lojas-grid">
              {lojas.map((loja, i) => (
                <LojaCard
                  key={i}
                  loja={loja}
                  dataInicio={dataInicio}
                  dataFim={dataFim}
                  onClick={(nome) => onLojaClick(nome, dataInicio, dataFim)}
                />
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
