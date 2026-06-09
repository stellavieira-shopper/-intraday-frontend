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
    case 'sla':     return arr.sort((a, b) => slaLoja(a)     - slaLoja(b))
    case 'ruptura': return arr.sort((a, b) => rupturaLoja(b) - rupturaLoja(a))
    case 'foto':    return arr.sort((a, b) => fotoLoja(a)    - fotoLoja(b))
    case 'pedidos': return arr.sort((a, b) => (Number(b.total_pedidos) || 0) - (Number(a.total_pedidos) || 0))
    default:        return arr
  }
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
  const [lojas, setLojas]               = useState([])
  const [loading, setLoading]           = useState(false)
  const [refreshing, setRefreshing]     = useState(false)
  const [bqRefreshing, setBqRefreshing] = useState(false)
  const [fromCache, setFromCache]       = useState(false)
  const [erro, setErro]                 = useState(null)
  const [lastUpdated, setLastUpdated]   = useState(null)
  const [autoRefresh, setAutoRefresh]   = useState(true)
  const [sortBy, setSortBy]             = useState('sla')

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

  const aggSlaPct     = totals.comSla     > 0 ? (totals.dentroSla / totals.comSla) * 100    : null
  const aggRupturaPct = totals.total      > 0 ? (totals.comRuptura / totals.total) * 100    : null
  const aggFotoPct    = totals.finalizados> 0 ? (totals.comFoto / totals.finalizados) * 100 : null
  const semFotoTotal  = totals.finalizados - totals.comFoto

  const lojasOrdenadas = sortLojas(lojas, sortBy)

  const now = new Date()
  const diaSemana  = now.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })
  const diaCompleto= now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })

  return (
    <div className="intraday-layout">
      <div className="intraday-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onVoltar && (
            <button className="btn-performance" onClick={onVoltar} title="Voltar ao menu">
              ← Menu
            </button>
          )}
          <div className="intraday-topbar__brand">
            <img src="/shopper-icon.avif" alt="Shopper" className="topbar-icon" />
            <div className="brand-divider" />
            <div>
              <div className="brand-label">INTRADAY</div>
              <div className="brand-title">Performance Operacional</div>
            </div>
          </div>
        </div>
        <div className="intraday-topbar__right">
          <label className="auto-refresh-toggle">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto (1min)
          </label>
          <button className="btn-refresh" onClick={handleAtualizar} disabled={loading || refreshing || bqRefreshing}
            title={bqRefreshing ? 'Aguarde — atualização em andamento' : 'Atualizar dados'}>
            {refreshing ? '⏳ Atualizando...' : (loading && lojas.length > 0) ? '⏳' : '↺ Atualizar'}
          </button>
          {user && (
            <div className="topbar-user">
              {user.picture && <img src={user.picture} alt={user.name} className="topbar-avatar" referrerPolicy="no-referrer" />}
              <span className="topbar-username">{user.name?.split(' ')[0]}</span>
              <button className="btn-logout" onClick={onLogout} title="Sair">Sair</button>
            </div>
          )}
        </div>
      </div>

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

      <div className="intraday-datebar">
        <div className="intraday-datebar__left">
          <div className="last-update-label">Última atualização</div>
          <div className="last-update-time">{fmtHora(lastUpdated)}</div>
          <div className="last-update-date">{diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)}, {diaCompleto}</div>
        </div>
        <div className="intraday-datebar__right">
          <DateFilter dataInicio={dataInicio} dataFim={dataFim} onChange={handleDateChange} />
        </div>
      </div>

      <div className="intraday-content">
        {erro && <div className="error-banner">⚠ {erro}</div>}

        {loading && lojas.length === 0 && (
          <div className="loading-state">
            <div className="spinner" />
            <span>Carregando dados...</span>
          </div>
        )}

        {!loading && lojas.length === 0 && !erro && (
          <div className="empty-state empty-state--full">
            Nenhuma loja encontrada para {fmtPeriodo(dataInicio, dataFim)}.
            <div style={{fontSize:'0.85rem', marginTop:'8px', opacity:0.6}}>
              Nenhum pedido finalizado encontrado para este período.
            </div>
          </div>
        )}

        {lojas.length > 0 && (
          <>
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

            <div className="perf-summary-bar" style={{ marginBottom: 16 }}>
              <div className="perf-summary-item">
                <span className="perf-summary-item__num">{totals.total.toLocaleString('pt-BR')}</span>
                <span className="perf-summary-item__lbl">Pedidos</span>
              </div>
              {aggSlaPct !== null && (
                <div className="perf-summary-item">
                  <span className="perf-summary-item__num" style={{ color: aggSlaPct >= 95 ? 'var(--green)' : aggSlaPct >= 80 ? 'var(--yellow)' : 'var(--red)' }}>
                    {aggSlaPct.toFixed(1)}%
                  </span>
                  <span className="perf-summary-item__lbl">SLA Geral</span>
                </div>
              )}
              {aggRupturaPct !== null && (
                <div className="perf-summary-item">
                  <span className="perf-summary-item__num" style={{ color: aggRupturaPct <= 2 ? 'var(--green)' : aggRupturaPct <= 5 ? 'var(--yellow)' : 'var(--red)' }}>
                    {aggRupturaPct.toFixed(1)}%
                  </span>
                  <span className="perf-summary-item__lbl">Ruptura Geral</span>
                </div>
              )}
              {aggFotoPct !== null && (
                <div className="perf-summary-item">
                  <span className="perf-summary-item__num" style={{ color: aggFotoPct >= 90 ? 'var(--green)' : aggFotoPct >= 80 ? 'var(--yellow)' : 'var(--red)' }}>
                    {aggFotoPct.toFixed(1)}%
                  </span>
                  <span className="perf-summary-item__lbl">Foto Geral</span>
                </div>
              )}
            </div>

            <div className="gerencial-header">
              <span className="gerencial-sort-label">
                Ordenado por: {SORT_OPTIONS.find(o => o.key === sortBy)?.label}
              </span>
              <div className="gerencial-sort-btns">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    className={`sort-btn${sortBy === opt.key ? ' sort-btn--active' : ''}`}
                    onClick={() => setSortBy(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <section className="lojas-grid">
              {lojasOrdenadas.map((loja, i) => (
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
