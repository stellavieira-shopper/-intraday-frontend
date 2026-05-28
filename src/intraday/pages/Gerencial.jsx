import { useState, useEffect, useCallback } from 'react'
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

export default function Gerencial({ onLojaClick, user, onLogout }) {
  const [dataInicio, setDataInicio] = useState(hoje())
  const [dataFim, setDataFim]       = useState(hoje())
  const [lojas, setLojas]           = useState([])
  const [loading, setLoading]       = useState(false)
  const [erro, setErro]             = useState(null)
  const [ultimaAtt, setUltimaAtt]   = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

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
      // Ordena por pior SLA primeiro
      const sorted = (resp.lojas || []).sort((a, b) => slaLoja(a) - slaLoja(b))
      setLojas(sorted)
      setUltimaAtt(new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }))
    } catch (e) {
      setErro(e.response?.data?.erro || e.message || 'Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [dataInicio, dataFim])

  useEffect(() => { buscar() }, [buscar])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(buscar, 60_000)
    return () => clearInterval(id)
  }, [autoRefresh, buscar])

  const saudes    = lojas.map(calcSaude)
  const criticos  = saudes.filter(s => s.variant === 'critico').length
  const atencao   = saudes.filter(s => s.variant === 'atencao').length
  const saudaveis = saudes.filter(s => s.variant === 'saudavel').length

  const now = new Date()
  const diaSemana = now.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })
  const diaCompleto = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })

  return (
    <div className="intraday-layout">
      {/* Topbar */}
      <div className="intraday-topbar">
        <div className="intraday-topbar__brand">
          <img src="/shopper-icon.avif" alt="Shopper" className="topbar-icon" />
          <div className="brand-divider" />
          <div>
            <div className="brand-label">INTRADAY</div>
            <div className="brand-title">Performance Operacional</div>
          </div>
        </div>
        <div className="intraday-topbar__right">
          <label className="auto-refresh-toggle">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto (1min)
          </label>
          <button className="btn-refresh" onClick={buscar} disabled={loading}>
            {loading ? '⏳' : '↺'} Atualizar
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

      {/* Barra de data */}
      <div className="intraday-datebar">
        <div className="intraday-datebar__left">
          <div className="last-update-label">Última atualização</div>
          <div className="last-update-time">{ultimaAtt || '—'}</div>
          <div className="last-update-date">{diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)}, {diaCompleto}</div>
        </div>
        <div className="intraday-datebar__right">
          <DateFilter dataInicio={dataInicio} dataFim={dataFim} onChange={handleDateChange} />
        </div>
      </div>

      <div className="intraday-content">
        {/* Erro */}
        {erro && <div className="error-banner">⚠ {erro}</div>}

        {/* Status bar */}
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

        {/* Loading */}
        {loading && lojas.length === 0 && (
          <div className="loading-state">
            <div className="spinner" />
            <span>Carregando dados...</span>
          </div>
        )}

        {!loading && lojas.length === 0 && !erro && (
          <div className="empty-state empty-state--full">
            Nenhuma loja encontrada para {fmtPeriodo(dataInicio, dataFim)}.
          </div>
        )}

        {/* Grid de lojas — pior SLA primeiro */}
        {lojas.length > 0 && (
          <>
            <div className="gerencial-header">
              <span className="gerencial-sort-label">Ordenado por SLA · pior primeiro</span>
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
