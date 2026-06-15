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

const FC_NOME = { 5: 'Pamplona', 6: 'Higienópolis', 8: 'São Caetano', 9: 'Vila Olímpia', 10: 'Barra Funda', 11: 'Alto de Pinheiros' }
const FC_IDS_DARK = new Set(Object.keys(FC_NOME).map(Number))
function nomeLoja(id) { return FC_NOME[id] || (id ? `FC ${id}` : 'Loja desconhecida') }

function fmtTs(v) {
  if (!v) return '—'
  const d = new Date(v.value || v)
  if (isNaN(d)) return String(v)
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const GRAVE_STYLE = {
  SIM:   { background: '#fde8e8', color: '#c0392b' },
  GRAVE: { background: '#fde8e8', color: '#c0392b' },
  NAO:   { background: '#e8f5e9', color: '#27ae60' },
}
function graveStyle(v) { return GRAVE_STYLE[String(v).toUpperCase()] || { background: '#f0f0f0', color: '#555' } }

function ErrosClientesTab({ rows, loading, erro }) {
  const [filtroLoja, setFiltroLoja] = useState('')

  const LOJAS_DARK = Object.entries(FC_NOME)
  const darkRows = rows.filter(r => FC_IDS_DARK.has(r.fulfillment_center_id))
  const filtrado = darkRows.filter(r => !filtroLoja || String(r.fulfillment_center_id) === filtroLoja)

  const COLS = ['Loja','Pedido','Data Entrega','Tipo de Erro','Grave','Responsabilidade','Produto','Tratativa','Link']

  return (
    <div>
      {erro && <div className="error-banner">⚠ {erro}</div>}
      {loading && (
        <div className="loading-state"><div className="spinner" /><span>Carregando erros de clientes...</span></div>
      )}
      {!loading && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Loja</span>
            <button onClick={() => setFiltroLoja('')}
              style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: !filtroLoja ? 'var(--shopper-red)' : '#fff', color: !filtroLoja ? '#fff' : 'var(--text)' }}>
              Todas
            </button>
            {LOJAS_DARK.map(([id, nome]) => (
              <button key={id} onClick={() => setFiltroLoja(filtroLoja === id ? '' : id)}
                style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: filtroLoja === id ? 'var(--shopper-red)' : '#fff', color: filtroLoja === id ? '#fff' : 'var(--text)' }}>
                {nome}
              </button>
            ))}
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {filtrado.length.toLocaleString('pt-BR')} registro(s)
            </span>
          </div>
          <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fc' }}>
                  {COLS.map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: 11,
                      textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)',
                      borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrado.length === 0 && (
                  <tr><td colSpan={COLS.length} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum erro encontrado.</td></tr>
                )}
                {filtrado.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                    <td style={{ padding: '7px 12px', fontWeight: 600 }}>{nomeLoja(r.fulfillment_center_id)}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{r.cod_pedido}</td>
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>{r.data_entrega || '—'}</td>
                    <td style={{ padding: '7px 12px' }}>{r.erro || '—'}</td>
                    <td style={{ padding: '7px 12px' }}>
                      <span style={{ ...graveStyle(r.grave), borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                        {r.grave || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '7px 12px' }}>{r.responsabilidade || '—'}</td>
                    <td style={{ padding: '7px 12px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.produto}>{r.produto || '—'}</td>
                    <td style={{ padding: '7px 12px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.tratativa}>{r.tratativa || '—'}</td>
                    <td style={{ padding: '7px 12px' }}>
                      {(() => {
                        const raw = r.link_drive || ''
                        if (!raw || raw.startsWith('ERRO')) return <span style={{ color: 'var(--text-muted)' }}>—</span>
                        const url = raw.startsWith('http') ? raw : `https://drive.google.com/drive${raw}`
                        return <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--shopper-red)', fontWeight: 600, fontSize: 11 }}>Ver →</a>
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function RupturasTab({ dataInicio, dataFim }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState(null)
  const [filtroLoja, setFiltroLoja] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setErro(null)
    axios.get(`${API}/api/intraday/rupturas`, { params: { data_inicio: dataInicio, data_fim: dataFim } })
      .then(r => { if (active) setRows(r.data.rupturas || []) })
      .catch(e => { if (active) setErro(e.response?.data?.erro || e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [dataInicio, dataFim])

  const lojas = [...new Set(rows.map(r => r.fulfillment_center_id))].sort()
  const filtrado = rows.filter(r => !filtroLoja || String(r.fulfillment_center_id) === filtroLoja)

  const LOJAS_DARK = Object.entries(FC_NOME)

  return (
    <div>
      {erro && <div className="error-banner">⚠ {erro}</div>}
      {loading && (
        <div className="loading-state"><div className="spinner" /><span>Carregando rupturas...</span></div>
      )}
      {!loading && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Loja</span>
            <button onClick={() => setFiltroLoja('')}
              style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: !filtroLoja ? 'var(--shopper-red)' : '#fff', color: !filtroLoja ? '#fff' : 'var(--text)' }}>
              Todas
            </button>
            {LOJAS_DARK.map(([id, nome]) => (
              <button key={id} onClick={() => setFiltroLoja(filtroLoja === id ? '' : id)}
                style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: filtroLoja === id ? 'var(--shopper-red)' : '#fff', color: filtroLoja === id ? '#fff' : 'var(--text)' }}>
                {nome}
              </button>
            ))}
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {filtrado.length.toLocaleString('pt-BR')} registro(s)
            </span>
          </div>
          <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fc' }}>
                  {['Loja','Pedido','Prev. Entrega','Criado em','Resolvido em','Qtd.','Subst.','Tipo','Itens Pedido','Itens Dist.'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: 11,
                      textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)',
                      borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrado.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum registro encontrado.</td></tr>
                )}
                {filtrado.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                    <td style={{ padding: '7px 12px', fontWeight: 600 }}>{nomeLoja(r.fulfillment_center_id)}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{r.cod_pedido}</td>
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>{r.dt_previsao_entrega?.value || r.dt_previsao_entrega || '—'}</td>
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>{fmtTs(r.created_at)}</td>
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap', color: r.resolved_at ? 'var(--green)' : 'var(--text-muted)' }}>{fmtTs(r.resolved_at)}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'center' }}>{r.qtd_total ?? '—'}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'center', color: r.replaced_qty > 0 ? 'var(--blue)' : 'var(--text-muted)' }}>{r.replaced_qty ?? 0}</td>
                    <td style={{ padding: '7px 12px' }}>
                      <span style={{ background: '#fde8e8', color: '#c0392b', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{r.issue_type || '—'}</span>
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'center' }}>{r.qtd_total_pedido ?? '—'}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'center' }}>{r.itens_distintos_pedido ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default function Gerencial({ onLojaClick, onVoltar, user, onLogout }) {
  const [dataInicio, setDataInicio] = useState(hoje())
  const [dataFim, setDataFim]       = useState(hoje())
  const [lojas, setLojas]               = useState([])
  const [loading, setLoading]           = useState(false)
  const [aba, setAba]                   = useState('lojas')
  const [refreshing, setRefreshing]     = useState(false)
  const [bqRefreshing, setBqRefreshing] = useState(false)
  const [fromCache, setFromCache]       = useState(false)
  const [erro, setErro]                 = useState(null)
  const [lastUpdated, setLastUpdated]   = useState(null)
  const [autoRefresh, setAutoRefresh]   = useState(true)
  const [sortBy, setSortBy]             = useState('sla')
  const [erros, setErros]               = useState([])
  const [errosLoading, setErrosLoading] = useState(false)
  const [errosErro, setErrosErro]       = useState(null)

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

  const buscarErros = useCallback(async () => {
    setErrosLoading(true)
    setErrosErro(null)
    try {
      const { data: resp } = await axios.get(`${API}/api/intraday/erros-clientes`)
      setErros(resp.erros || [])
    } catch (e) {
      setErrosErro(e.response?.data?.erro || e.message)
    } finally {
      setErrosLoading(false)
    }
  }, [])

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
  useEffect(() => { buscarErros() }, [buscarErros])

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

  const errosPeriodo = erros.filter(e => {
    if (!e.data_entrega) return false
    const [d, m, y] = e.data_entrega.split('/')
    if (!y) return false
    const iso = `${y}-${m}-${d}`
    return iso >= dataInicio && iso <= dataFim
  })
  const pedidosComErro = new Set(errosPeriodo.map(e => e.cod_pedido)).size
  const aggErroPct     = totals.total > 0 ? (pedidosComErro / totals.total) * 100 : null

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
        {/* Seletor de abas */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
          {[{ key: 'lojas', label: 'Lojas' }, { key: 'rupturas', label: 'Rupturas Detalhadas' }, { key: 'erros', label: 'Erros Reportados por Clientes' }].map(tab => (
            <button key={tab.key} onClick={() => setAba(tab.key)} style={{
              padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, color: aba === tab.key ? 'var(--shopper-red)' : 'var(--text-muted)',
              borderBottom: aba === tab.key ? '2px solid var(--shopper-red)' : '2px solid transparent',
              marginBottom: -2, transition: 'color 0.15s'
            }}>{tab.label}</button>
          ))}
        </div>

        {aba === 'rupturas' && <RupturasTab dataInicio={dataInicio} dataFim={dataFim} />}
        {aba === 'erros'    && <ErrosClientesTab rows={errosPeriodo} loading={errosLoading} erro={errosErro} />}

        {aba === 'lojas' && <>
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
              {aggErroPct !== null && (
                <div className="perf-summary-item" style={{ cursor: 'pointer' }} onClick={() => setAba('erros')} title="Ver erros de clientes">
                  <span className="perf-summary-item__num" style={{ color: aggErroPct <= 1 ? 'var(--green)' : aggErroPct <= 3 ? 'var(--yellow)' : 'var(--red)' }}>
                    {aggErroPct.toFixed(1)}%
                  </span>
                  <span className="perf-summary-item__lbl">Pedidos c/ Erro</span>
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
        </>}
      </div>
    </div>
  )
}
