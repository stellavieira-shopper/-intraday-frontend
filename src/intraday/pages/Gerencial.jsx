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

// Returns a human-friendly period label for the page header
function periodoLabel(ini, fim) {
  const tod = hoje()
  // Compute yesterday
  const ystDate = new Date(tod + 'T12:00:00Z')
  ystDate.setUTCDate(ystDate.getUTCDate() - 1)
  const ystr = ystDate.toISOString().slice(0, 10)
  // 7 days: from 6 days ago to today
  const d7 = new Date(tod + 'T12:00:00Z'); d7.setUTCDate(d7.getUTCDate() - 6)
  const d7str = d7.toISOString().slice(0, 10)
  // 30 days: from 29 days ago to today
  const d30 = new Date(tod + 'T12:00:00Z'); d30.setUTCDate(d30.getUTCDate() - 29)
  const d30str = d30.toISOString().slice(0, 10)

  if (ini === tod && fim === tod) return 'Hoje'
  if (ini === ystr && fim === ystr) return 'Ontem'
  if (ini === d7str && fim === tod) return 'Últimos 7 dias'
  if (ini === d30str && fim === tod) return 'Últimos 30 dias'
  const fmt = iso => { const [, m, d] = iso.split('-'); return `${d}/${m}` }
  return ini === fim ? fmt(ini) : `${fmt(ini)} → ${fmt(fim)}`
}

function slaLoja(l) {
  const comSla = Number(l.pedidos_com_sla) || 0
  const dentroSla = Number(l.pedidos_dentro_sla) || 0
  return comSla > 0 ? dentroSla / comSla : 1
}

function rupturaLoja(l) {
  const total = Number(l.total_pedidos) || 0
  const ruptura = Number(l.pedidos_com_ruptura) || 0
  return total > 0 ? ruptura / total : 0
}

function fotoLoja(l) {
  const fin = Number(l.pedidos_finalizados) || 0
  const foto = Number(l.pedidos_com_foto) || 0
  return fin > 0 ? foto / fin : 1
}

function sortLojas(list, by) {
  const arr = [...list]
  switch (by) {
    case 'sla':     return arr.sort((a, b) => slaLoja(a)     - slaLoja(b))      // pior SLA primeiro
    case 'ruptura': return arr.sort((a, b) => rupturaLoja(b) - rupturaLoja(a))  // mais ruptura primeiro
    case 'foto':    return arr.sort((a, b) => fotoLoja(a)    - fotoLoja(b))     // pior foto primeiro
    case 'pedidos': return arr.sort((a, b) => (Number(b.total_pedidos) || 0) - (Number(a.total_pedidos) || 0))
    default:        return arr
  }
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

const SORT_OPTIONS = [
  { key: 'sla',     label: 'Pior SLA' },
  { key: 'ruptura', label: 'Mais ruptura' },
  { key: 'foto',    label: 'Menos foto' },
  { key: 'pedidos', label: 'Mais pedidos' },
]

export default function Gerencial({ onLojaClick, onVoltar, user, onLogout }) {
  const [dataInicio, setDataInicio] = useState(hoje())
  const [dataFim, setDataFim]       = useState(hoje())
  const [lojas, setLojas]           = useState([])
  const [loading, setLoading]       = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [bqRefreshing, setBqRefreshing] = useState(false)
  const [fromCache, setFromCache]   = useState(false)
  const [erro, setErro]             = useState(null)
  // Auto-refresh: on by default when viewing today's data
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [sortBy, setSortBy]           = useState('sla')

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
      setLojas(resp.lojas || [])
      setFromCache(!!resp.fromCache)
      setBqRefreshing(!!resp.refreshing)
      setLastUpdated(new Date())
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

  // Format last-updated time
  const fmtHora = (d) => d
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'
  const fmtData = (d) => d
    ? d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''

  const saudes    = lojas.map(calcSaude)
  const criticos  = saudes.filter(s => s.variant === 'critico').length
  const atencao   = saudes.filter(s => s.variant === 'atencao').length
  const saudaveis = saudes.filter(s => s.variant === 'saudavel').length
  const firstName = user?.name?.split(' ')[0] || ''

  // Aggregate KPIs across all stores (V1 style)
  const totals = lojas.reduce((acc, l) => {
    acc.total      += Number(l.total_pedidos)       || 0
    acc.comSla     += Number(l.pedidos_com_sla)     || 0
    acc.dentroSla  += Number(l.pedidos_dentro_sla)  || 0
    acc.foraSla    += Number(l.pedidos_fora_sla)    || 0
    acc.comRuptura += Number(l.pedidos_com_ruptura) || 0
    acc.finalizados+= Number(l.pedidos_finalizados) || 0
    acc.comFoto    += Number(l.pedidos_com_foto)    || 0
    return acc
  }, { total: 0, comSla: 0, dentroSla: 0, foraSla: 0, comRuptura: 0, finalizados: 0, comFoto: 0 })

  const aggSlaPct     = totals.comSla     > 0 ? (totals.dentroSla / totals.comSla) * 100     : null
  const aggRupturaPct = totals.total      > 0 ? (totals.comRuptura / totals.total) * 100     : null
  const aggFotoPct    = totals.finalizados> 0 ? (totals.comFoto / totals.finalizados) * 100  : null
  const semFotoTotal  = totals.finalizados - totals.comFoto

  function slaStatus(p)  { if (p===null) return 'neutral'; return p>=95?'ok':p>=85?'warn':'bad' }
  function ruptStatus(p) { if (p===null) return 'neutral'; return p<2?'ok':p<5?'warn':'bad' }
  function fotoStatus(p) { if (p===null) return 'neutral'; return p>=90?'ok':p>=75?'warn':'bad' }

  const lojasOrdenadas = sortLojas(lojas, sortBy)

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
          className="btn-atualizar"
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

      {/* DateFilter bar com "Última atualização" à esquerda e auto-refresh chip + filtros à direita */}
      <div className="intraday-datebar">
        <div className="intraday-datebar__left">
          <div className="last-update-label">Última atualização</div>
          <div className="last-update-time">{fmtHora(lastUpdated)}</div>
          <div className="last-update-date">{fmtData(lastUpdated)}</div>
        </div>
        <div className="intraday-datebar__right">
          {autoRefresh ? (
            <span className="auto-refresh-chip">
              <CheckIcon /> Atualização automática de minuto em minuto ligada
            </span>
          ) : (
            <span className="auto-refresh-chip auto-refresh-chip-off">
              Atualização automática desligada
            </span>
          )}
          <DateFilter dataInicio={dataInicio} dataFim={dataFim} onChange={handleDateChange} />
        </div>
      </div>

      <div className="intraday-content">
        {erro && <div className="error-banner">⚠ {erro}</div>}

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
            {/* V1 page header — ACIMA dos mini-cards */}
            <div className="page-header">
              <div className="page-title-wrap">
                <span className="page-eyebrow">Visão Gerencial</span>
                <h1 className="page-title">
                  {lojas.length} loja{lojas.length !== 1 ? 's' : ''} em operação
                  <span className="page-title-period"> · {periodoLabel(dataInicio, dataFim)}</span>
                </h1>
                <p className="page-subtitle">Toque em uma loja para abrir a visão de supervisor</p>
              </div>
            </div>

            {/* V1 aggregate KPI strip — 5 cards */}
            <div className="kpi-grid kpi-grid-5">
              <div className="kpi-card">
                <div className="kpi-card-head">
                  <span className="kpi-label">% SLA 5 min</span>
                  <span className={`kpi-status-dot ${slaStatus(aggSlaPct)}`} />
                </div>
                <div className="kpi-value-row">
                  <span className={`kpi-value ${slaStatus(aggSlaPct)}`}>{aggSlaPct !== null ? aggSlaPct.toFixed(1) : '—'}</span>
                  {aggSlaPct !== null && <span className="kpi-unit">%</span>}
                </div>
                <div className="kpi-foot">
                  <span className="kpi-raw"><strong>{totals.foraSla.toLocaleString('pt-BR')}</strong> de {totals.comSla.toLocaleString('pt-BR')} fora do prazo</span>
                </div>
                <div className="kpi-track"><div className={`kpi-track-fill ${slaStatus(aggSlaPct)}`} style={{ width: `${Math.min(aggSlaPct ?? 0, 100)}%` }} /></div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-head">
                  <span className="kpi-label">% com ruptura</span>
                  <span className={`kpi-status-dot ${ruptStatus(aggRupturaPct)}`} />
                </div>
                <div className="kpi-value-row">
                  <span className={`kpi-value ${ruptStatus(aggRupturaPct)}`}>{aggRupturaPct !== null ? aggRupturaPct.toFixed(1) : '—'}</span>
                  {aggRupturaPct !== null && <span className="kpi-unit">%</span>}
                </div>
                <div className="kpi-foot">
                  <span className="kpi-raw"><strong>{totals.comRuptura.toLocaleString('pt-BR')}</strong> pedidos com ruptura</span>
                </div>
                <div className="kpi-track"><div className={`kpi-track-fill ${ruptStatus(aggRupturaPct)}`} style={{ width: `${Math.min(aggRupturaPct ?? 0, 10) * 10}%` }} /></div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-head">
                  <span className="kpi-label">% com erro</span>
                  <span className="kpi-status-dot ok" />
                </div>
                <div className="kpi-value-row">
                  <span className="kpi-value ok">0.0</span>
                  <span className="kpi-unit">%</span>
                </div>
                <div className="kpi-foot">
                  <span className="kpi-raw"><strong>0</strong> pedidos com erro</span>
                </div>
                <div className="kpi-track"><div className="kpi-track-fill ok" style={{ width: '0%' }} /></div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-head">
                  <span className="kpi-label">% com foto</span>
                  <span className={`kpi-status-dot ${fotoStatus(aggFotoPct)}`} />
                </div>
                <div className="kpi-value-row">
                  <span className={`kpi-value ${fotoStatus(aggFotoPct)}`}>{aggFotoPct !== null ? aggFotoPct.toFixed(1) : '—'}</span>
                  {aggFotoPct !== null && <span className="kpi-unit">%</span>}
                </div>
                <div className="kpi-foot">
                  <span className="kpi-raw"><strong>{semFotoTotal.toLocaleString('pt-BR')}</strong> de {totals.finalizados.toLocaleString('pt-BR')} sem foto</span>
                </div>
                <div className="kpi-track"><div className={`kpi-track-fill ${fotoStatus(aggFotoPct)}`} style={{ width: `${Math.min(aggFotoPct ?? 0, 100)}%` }} /></div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-head">
                  <span className="kpi-label">Total de pedidos</span>
                  <span className="kpi-status-dot neutral" />
                </div>
                <div className="kpi-value-row">
                  <span className="kpi-value">{totals.total.toLocaleString('pt-BR')}</span>
                </div>
                <div className="kpi-foot">
                  <span className="kpi-raw">{lojas.length} lojas · todos os turnos</span>
                </div>
                <div className="kpi-track"><div className="kpi-track-fill" style={{ width: `${Math.min(totals.total / 2500 * 100, 100)}%` }} /></div>
              </div>
            </div>

            {/* Status mini-cards — ABAIXO do KPI strip */}
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

            {/* Seção de lojas com filtro de ordenação */}
            <div className="lojas-section-header">
              <div className="lojas-section-title-wrap">
                <h2 className="lojas-section-title">Lojas</h2>
                <p className="lojas-section-sub">Ordenadas por · {SORT_OPTIONS.find(o => o.key === sortBy)?.label}</p>
              </div>
              <div className="sort-tabs">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    className={`sort-tab${sortBy === opt.key ? ' sort-tab--active' : ''}`}
                    onClick={() => setSortBy(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="store-grid">
              {lojasOrdenadas.map((loja, i) => (
                <LojaCard
                  key={i}
                  loja={loja}
                  dataInicio={dataInicio}
                  dataFim={dataFim}
                  onClick={(nome) => onLojaClick(nome, dataInicio, dataFim)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
