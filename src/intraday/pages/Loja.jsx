import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import TabelaOperadores from '../components/TabelaOperadores.jsx'
import TabelaTurnos from '../components/TabelaTurnos.jsx'
import PedidosRecentes from '../components/PedidosRecentes.jsx'
import TopRupturas from '../components/TopRupturas.jsx'
import DateFilter from '../components/DateFilter.jsx'
import Accordion from '../components/Accordion.jsx'
import { calcSaude } from '../components/StatusBadge.jsx'
import { nomeLoja } from '../utils/nomeLoja.js'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function pctVal(num, den) {
  if (!den || den === 0) return null
  return (num / den) * 100
}

function fmtPeriodo(ini, fim) {
  const fmt = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
  return ini === fim ? fmt(ini) : `${fmt(ini)} → ${fmt(fim)}`
}

function hoje() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

function fmtHora(h) {
  if (!h) return '—'
  // BQ TIME fields chegam como objeto {value: "HH:MM:SS"}
  const v = (h && typeof h === 'object' && h.value) ? h.value : h
  return String(v).slice(0, 5)
}

function fmtMin(sec) {
  if (sec == null) return '—'
  const m = Math.floor(Number(sec) / 60)
  const s = Number(sec) % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Agrupamento por conveyor_stage_id (tabela operations real-time)
function stageGroup(stageId, stageName) {
  const c = Number(stageId)
  const n = (stageName || '').toUpperCase()
  if (c === 0 || n.includes('AGUARDANDO')) return 'aguardando'
  if (c === 1 || n.includes('PICKING'))   return 'picking'
  if (c === 18 || n.includes('FINALIZADO')) return 'finalizado'
  if (c === 99 || n.includes('CANCELADO')) return 'cancelado'
  if (n.includes('HOSPITAL') || n.includes('DIVERGÊNCIA') || n.includes('DIVERGENCIA')) return 'hospital'
  return 'packing'
}

// Remove prefixo "FRESH - " do nome da etapa para exibição
function cleanStageName(name) {
  if (!name) return '—'
  return name.replace(/^FRESH\s*-\s*/i, '').trim()
}

const GROUP_LABEL = {
  em_andamento: 'Em andamento',
  aguardando:   'Aguardando',
  finalizado:   'Finalizado',
  outro:        'Outro',
}

const GROUP_COLOR = {
  em_andamento: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  aguardando:   { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  finalizado:   { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
  outro:        { bg: '#f9fafb', text: '#6b7280', border: '#d1d5db' },
}

/** Card KPI grande */
function KpiLoja({ label, value, sup, sub, dotClass, barPct, barClass }) {
  return (
    <div className="loja-kpi-card">
      <div className="loja-kpi-card__header">
        <span className="loja-kpi-card__label">{label}</span>
        <span className={`loja-kpi-dot ${dotClass}`} />
      </div>
      <div className={`loja-kpi-card__value loja-kpi-card__value--${barClass ?? 'gray'}`}>
        {value}{sup && <sup>{sup}</sup>}
      </div>
      <div className="loja-kpi-card__sub">{sub}</div>
      <div className="loja-kpi-bar">
        <div className={`loja-kpi-bar__fill loja-kpi-bar__fill--${barClass ?? 'gray'}`}
          style={{ width: `${Math.min(barPct ?? 0, 100)}%` }} />
      </div>
    </div>
  )
}

// Badge colorida — usa nome real da esteira (já legível)
function StageBadge({ stageId, stageName }) {
  const group = stageGroup(stageId, stageName)
  const label = cleanStageName(stageName) || `Stage ${stageId}`
  const { bg, text, border } = GROUP_COLOR[group] || GROUP_COLOR.outro
  return (
    <span style={{
      background: bg, color: text, border: `1px solid ${border}`,
      borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

const CANAL_CFG = {
  'iFood':       { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  'Shopper Now': { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  'Agendado':    { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
  'Shopper':     { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
}
function CanalBadge({ canal }) {
  if (!canal || canal === 'Outro' || canal === 'N/A') return <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>
  const cfg = CANAL_CFG[canal] || { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' }
  return (
    <span style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {canal}
    </span>
  )
}

function PickingBadge({ status }) {
  if (!status) return <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>
  const cfg = {
    'EM_ANDAMENTO': { bg: '#dbeafe', text: '#1e40af', label: 'Em andamento' },
    'FINALIZADO':   { bg: '#d1fae5', text: '#065f46', label: 'Finalizado' },
    'NAO_INICIADO': { bg: '#f1f5f9', text: '#64748b', label: 'Não iniciado' },
  }[status] || { bg: '#f1f5f9', text: '#64748b', label: status }
  return (
    <span style={{ background: cfg.bg, color: cfg.text, borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>
      {cfg.label}
    </span>
  )
}

const CANAIS = [
  { id: 'todos',   label: 'Todos',       color: '#334155' },
  { id: 'ifood',   label: 'iFood',       color: '#ef4444' },
  { id: 'shopper', label: 'Shopper Now', color: '#10b981' },
]

const ABAS = [
  { id: 'geral',     label: 'Visão Geral' },
]

// ─── Componente Esteira ───────────────────────────────────────────────────────
function TabEsteira({ loja, dataInicio, dataFim }) {
  const [pedidos, setPedidos]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [erro, setErro]         = useState(null)
  const [canal, setCanal]       = useState('Todos')
  const [busca, setBusca]       = useState('')

  useEffect(() => {
    setLoading(true)
    setErro(null)
    axios.get(`${API}/api/intraday/loja/${encodeURIComponent(loja)}/esteira`, {
      params: { data_inicio: dataInicio, data_fim: dataFim },
    })
      .then(r => setPedidos(r.data.pedidos || []))
      .catch(e => setErro(e.response?.data?.erro || e.message))
      .finally(() => setLoading(false))
  }, [loja, dataInicio, dataFim])

  if (loading) return <div className="loading-state"><div className="spinner" /><span>Carregando esteira...</span></div>
  if (erro)    return <div className="error-banner">⚠ {erro}</div>
  if (!pedidos) return null

  const canaisDisp = ['Todos', ...new Set(pedidos.map(p => p.canal_label).filter(Boolean))]
  const filtrados = pedidos.filter(p =>
    (canal === 'Todos' || p.canal_label === canal) &&
    (!busca || p.operador?.toLowerCase().includes(busca.toLowerCase()) || p.cod_pedido?.toLowerCase().includes(busca.toLowerCase()))
  )

  // Agrupar por status do pedido (não pela etapa da esteira)
  const ORDER = ['em_andamento', 'aguardando', 'finalizado', 'outro']
  const STATUS_GROUP = {
    2:  'em_andamento',  // Em atendimento
    1:  'aguardando',    // Aberto
    98: 'aguardando',    // Aguardando Integração
    7:  'finalizado',    // Atendido
  }
  const grupos = {}
  for (const p of filtrados) {
    const g = STATUS_GROUP[p.kdabra_order_status_id] || 'outro'
    if (!grupos[g]) grupos[g] = []
    grupos[g].push(p)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {canaisDisp.map(c => (
            <button key={c} onClick={() => setCanal(c)} style={{
              padding: '5px 14px', borderRadius: 16, border: canal === c ? 'none' : '1px solid var(--border)',
              background: canal === c ? '#334155' : 'var(--surface)', color: canal === c ? '#fff' : 'var(--text-muted)',
              fontWeight: canal === c ? 700 : 500, fontSize: 12, cursor: 'pointer',
            }}>{c}</button>
          ))}
        </div>
        <input
          placeholder="Buscar operador ou pedido..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, flex: 1, minWidth: 160, background: 'var(--surface)', color: 'var(--text)' }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtrados.length} pedidos</span>
      </div>

      {ORDER.filter(g => grupos[g]?.length).map(g => (
        <div key={g} style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
            padding: '6px 12px', borderRadius: 6,
            background: GROUP_COLOR[g].bg, borderLeft: `3px solid ${GROUP_COLOR[g].border}`,
          }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: GROUP_COLOR[g].text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {GROUP_LABEL[g]}
            </span>
            <span style={{ fontSize: 11, color: GROUP_COLOR[g].text, opacity: 0.7 }}>{grupos[g].length} pedidos</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Pedido', 'Status', 'Etapa Esteira', 'Canal', 'Turno', 'Operador', 'Início Etapa', 'Fim Etapa', 'Ruptura', 'Foto'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grupos[g].map((p, i) => {
                  const fmtDt = dt => {
                    if (!dt) return '—'
                    const v = (dt && typeof dt === 'object' && dt.value) ? dt.value : dt
                    return new Date(v).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
                  }
                  return (
                    <tr key={p.cod_pedido || i} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'transparent' : '#fafbfc' }}>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{p.cod_pedido}</td>
                      <td style={{ padding: '8px 10px', fontSize: 11, color: p.kdabra_order_status_id === 2 ? '#1e40af' : p.kdabra_order_status_id === 7 ? '#475569' : 'var(--text-muted)', fontWeight: p.kdabra_order_status_id === 2 ? 700 : 400 }}>{p.order_status || '—'}</td>
                      <td style={{ padding: '8px 10px' }}><StageBadge stageId={p.conveyor_stage_id} stageName={p.conveyor_stage_name} /></td>
                      <td style={{ padding: '8px 10px' }}><CanalBadge canal={p.canal_label} /></td>
                      <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)' }}>{p.turno || '—'}</td>
                      <td style={{ padding: '8px 10px', fontSize: 11 }}>{p.operador || '—'}</td>
                      <td style={{ padding: '8px 10px', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{fmtDt(p.started_stage_at)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{fmtDt(p.end_stage_at)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 11, color: p.had_rupture ? 'var(--red)' : 'var(--text-dim)' }}>
                        {p.had_rupture ? '⚠ Sim' : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 11 }}>
                        {p.has_photo ? <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓ {p.photo_count ?? ''}</span> : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {filtrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Nenhum pedido encontrado.</div>
      )}
    </div>
  )
}

// ─── Componente Divergências Fotos ────────────────────────────────────────────
function TabDivergenciasFotos({ loja, dataInicio, dataFim }) {
  const [evidencias, setEvidencias] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [erro, setErro]             = useState(null)

  useEffect(() => {
    setLoading(true)
    setErro(null)
    axios.get(`${API}/api/intraday/loja/${encodeURIComponent(loja)}/evidencias-fotos`, {
      params: { data_inicio: dataInicio, data_fim: dataFim },
    })
      .then(r => setEvidencias(r.data.evidencias || []))
      .catch(e => setErro(e.response?.data?.erro || e.message))
      .finally(() => setLoading(false))
  }, [loja, dataInicio, dataFim])

  if (loading) return <div className="loading-state"><div className="spinner" /><span>Carregando divergências...</span></div>
  if (erro)    return <div className="error-banner">⚠ {erro}</div>
  if (!evidencias) return null

  const fmtHora = dt => {
    if (!dt) return '—'
    const v = (dt && typeof dt === 'object' && dt.value) ? dt.value : dt
    return new Date(v).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
        ⚠ Pedidos com foto registrada mas <strong>ainda não finalizados</strong> no sistema — {evidencias.length} ocorrência{evidencias.length !== 1 ? 's' : ''}
      </div>

      {evidencias.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--green)', fontWeight: 600 }}>✓ Nenhuma divergência encontrada.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Pedido', 'Status Atual', 'Etapa Esteira', 'Operador', 'Turno', 'Qtd Fotos', 'Hora Foto'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evidencias.map((e, i) => (
                <tr key={e.cod_pedido || i} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'transparent' : '#fafbfc' }}>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{e.cod_pedido}</td>
                  <td style={{ padding: '8px 10px', fontSize: 11, color: '#d97706', fontWeight: 600 }}>{e.order_status || '—'}</td>
                  <td style={{ padding: '8px 10px' }}><StageBadge stageName={e.conveyor_stage_name} /></td>
                  <td style={{ padding: '8px 10px', fontSize: 11 }}>{e.operador || '—'}</td>
                  <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)' }}>{e.turno || '—'}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--green)' }}>{e.photo_count ?? '—'}</td>
                  <td style={{ padding: '8px 10px', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{fmtHora(e.hora_foto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Componente Cancelados ────────────────────────────────────────────────────
function TabCancelados({ loja, dataInicio, dataFim }) {
  const [cancelados, setCancelados] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [erro, setErro]             = useState(null)
  const [filtro, setFiltro]         = useState('todos')

  useEffect(() => {
    setLoading(true)
    setErro(null)
    axios.get(`${API}/api/intraday/loja/${encodeURIComponent(loja)}/cancelados`, {
      params: { data_inicio: dataInicio, data_fim: dataFim },
    })
      .then(r => setCancelados(r.data.cancelados || []))
      .catch(e => setErro(e.response?.data?.erro || e.message))
      .finally(() => setLoading(false))
  }, [loja, dataInicio, dataFim])

  if (loading) return <div className="loading-state"><div className="spinner" /><span>Carregando cancelados...</span></div>
  if (erro)    return <div className="error-banner">⚠ {erro}</div>
  if (!cancelados) return null

  const comPicking    = cancelados.filter(p => p.foi_picado)
  const semPicking    = cancelados.filter(p => !p.foi_picado)

  const lista = filtro === 'com_picking' ? comPicking
              : filtro === 'sem_picking' ? semPicking
              : cancelados

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { id: 'todos',       label: `Todos (${cancelados.length})`,              color: '#334155' },
          { id: 'com_picking', label: `Picking iniciado (${comPicking.length})`,   color: '#f59e0b' },
          { id: 'sem_picking', label: `Sem picking (${semPicking.length})`,        color: '#10b981' },
        ].map(opt => (
          <button key={opt.id} onClick={() => setFiltro(opt.id)} style={{
            padding: '5px 14px', borderRadius: 16, border: filtro === opt.id ? 'none' : '1px solid var(--border)',
            background: filtro === opt.id ? opt.color : 'var(--surface)', color: filtro === opt.id ? '#fff' : 'var(--text-muted)',
            fontWeight: filtro === opt.id ? 700 : 500, fontSize: 12, cursor: 'pointer',
          }}>{opt.label}</button>
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 4 }}>
          {comPicking.length > 0 && `⚠ ${comPicking.length} cancelados após início de picking`}
        </span>
      </div>

      {lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Nenhum pedido cancelado.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Pedido', 'Picking feito?', 'Status Picking', 'Canal', 'Entrada', 'Início Pick.', 'Fim Pick.', 'Operador', 'Turno'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((p, i) => (
                <tr key={p.cod_pedido || i} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'transparent' : '#fafbfc' }}>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{p.cod_pedido}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{
                      background: p.foi_picado ? '#fef3c7' : '#d1fae5',
                      color: p.foi_picado ? '#92400e' : '#065f46',
                      borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                    }}>
                      {p.foi_picado ? '⚠ Sim' : '✓ Não'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px' }}><PickingBadge status={p.status_picking} /></td>
                  <td style={{ padding: '8px 10px', fontSize: 11 }}>{p.canal_label || '—'}</td>
                  <td style={{ padding: '8px 10px', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{fmtHora(p.entrada_pedido_sistema_hora)}</td>
                  <td style={{ padding: '8px 10px', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{fmtHora(p.inicio_picking_hora)}</td>
                  <td style={{ padding: '8px 10px', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{fmtHora(p.fim_picking_hora)}</td>
                  <td style={{ padding: '8px 10px', fontSize: 11 }}>{p.operador || '—'}</td>
                  <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)' }}>{p.turno || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Loja({ loja, dataInicio: dataInicioInit, dataFim: dataFimInit, onVoltar, user, onLogout }) {
  const [dataInicio, setDataInicio]         = useState(dataInicioInit)
  const [dataFim, setDataFim]               = useState(dataFimInit)
  const [canal, setCanal]                   = useState('todos')
  const [excluirNoturno, setExcluirNoturno] = useState(false)
  const [dados, setDados]                   = useState(null)
  const [loading, setLoading]               = useState(false)
  const [erro, setErro]                     = useState(null)
  const [ultimaAtt, setUltimaAtt]           = useState(null)
  const [filtroOperador, setFiltroOperador] = useState('')
  const [abaAtiva, setAbaAtiva]             = useState('geral')

  function handleDateChange({ dataInicio: ini, dataFim: fim }) {
    setDataInicio(ini)
    setDataFim(fim)
  }

  const buscar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const params = { data_inicio: dataInicio, data_fim: dataFim }
      if (canal !== 'todos') params.canal = canal
      if (excluirNoturno) params.excluir_noturno = 'true'
      const { data: resp } = await axios.get(
        `${API}/api/intraday/loja/${encodeURIComponent(loja)}`,
        { params }
      )
      setDados(resp)
      setUltimaAtt(new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }))
    } catch (e) {
      setErro(e.response?.data?.erro || e.message || 'Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [loja, dataInicio, dataFim, canal, excluirNoturno])

  useEffect(() => { buscar() }, [buscar])

  const kpis = dados?.kpis || {}
  const saude = calcSaude(kpis)
  const nome = nomeLoja(loja)

  const totalPedidos  = Number(kpis.total_pedidos)       || 0
  const dentroSla     = Number(kpis.pedidos_dentro_sla)  || 0
  const comSla        = Number(kpis.pedidos_com_sla)     || 0
  const foraSla       = Number(kpis.pedidos_fora_sla)    || 0
  const comRuptura    = Number(kpis.pedidos_com_ruptura) || 0
  const finalizados   = Number(kpis.pedidos_finalizados) || 0
  const comFoto       = Math.min(Number(kpis.pedidos_com_foto) || 0, finalizados)
  const semFoto       = finalizados - comFoto

  const pctSla     = pctVal(dentroSla, comSla)
  const pctRuptura = pctVal(comRuptura, totalPedidos)
  const pctFoto    = pctVal(comFoto, finalizados)

  const slaColor     = pctSla === null ? 'gray' : pctSla >= 85 ? 'green' : pctSla >= 70 ? 'orange' : 'red'
  const rupturaColor = pctRuptura === null ? 'gray' : pctRuptura <= 5 ? 'green' : pctRuptura <= 15 ? 'orange' : 'red'
  const fotoColor    = pctFoto === null ? 'gray' : pctFoto >= 70 ? 'green' : pctFoto >= 30 ? 'orange' : 'red'

  return (
    <div className="intraday-layout">
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
          <button className="btn-refresh" onClick={buscar} disabled={loading}>
            {loading ? '⏳ Atualizando...' : '↺ Atualizar'}
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

      <div className="intraday-datebar">
        <div className="intraday-datebar__left">
          <div className="last-update-label">Última atualização</div>
          <div className="last-update-time">{ultimaAtt || '—'}</div>
        </div>
        <div className="intraday-datebar__right">
          <DateFilter dataInicio={dataInicio} dataFim={dataFim} onChange={handleDateChange} />
        </div>
      </div>

      {/* Hero da loja */}
      <div className="loja-hero">
        <button className="btn-voltar" onClick={onVoltar} style={{ marginBottom: 12 }}>← Voltar para visão consolidada</button>
        <div className="loja-hero__eyebrow">VISÃO DA LOJA · SUPERVISOR</div>
        <div className="loja-hero__nome">
          <span className={`saude-dot saude-dot--${saude.variant}`} />
          {nome}
        </div>
        {abaAtiva === 'geral' && (
          <div className="loja-canal-tabs" style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {CANAIS.map(c => (
              <button
                key={c.id}
                onClick={() => setCanal(c.id)}
                style={{
                  padding: '6px 18px', borderRadius: 20,
                  border: canal === c.id ? 'none' : '1px solid var(--border)',
                  background: canal === c.id ? c.color : 'var(--surface)',
                  color: canal === c.id ? '#fff' : 'var(--text-muted)',
                  fontWeight: canal === c.id ? 700 : 500, fontSize: 13,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Abas de navegação */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', padding: '0 24px', background: 'var(--surface)', gap: 2 }}>
        {ABAS.map(aba => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: abaAtiva === aba.id ? '2px solid #334155' : '2px solid transparent',
              background: 'transparent',
              color: abaAtiva === aba.id ? '#334155' : 'var(--text-muted)',
              fontWeight: abaAtiva === aba.id ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer',
              marginBottom: -2,
              transition: 'all 0.15s',
            }}
          >
            {aba.label}
          </button>
        ))}
      </div>

      <div className="intraday-content">
        {erro && <div className="error-banner">⚠ {erro}</div>}

        {/* ABA: Visão Geral */}
        {abaAtiva === 'geral' && (
          <>
            {loading && !dados && (
              <div className="loading-state">
                <div className="spinner" />
                <span>Carregando dados de {nome}...</span>
              </div>
            )}

            {dados && (
              <>
                {canal !== 'shopper' && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                    {[
                      { val: false, label: 'Com pedidos 23h-00h' },
                      { val: true,  label: 'Sem pedidos 23h-00h' },
                    ].map(opt => (
                      <button
                        key={String(opt.val)}
                        onClick={() => setExcluirNoturno(opt.val)}
                        style={{
                          padding: '5px 14px', borderRadius: 16,
                          border: excluirNoturno === opt.val ? 'none' : '1px solid var(--border)',
                          background: excluirNoturno === opt.val ? '#f59e0b' : 'var(--surface)',
                          color: excluirNoturno === opt.val ? '#fff' : 'var(--text-muted)',
                          fontWeight: excluirNoturno === opt.val ? 700 : 500,
                          fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>iFood · pedidos fora da performance</span>
                  </div>
                )}

                <div className="loja-kpi-grid">
                  <KpiLoja
                    label="SLA 5 min (Turbo + Fast)"
                    value={pctSla !== null ? pctSla.toFixed(1) : '—'}
                    sup={pctSla !== null ? ' %' : ''}
                    sub={comSla > 0 ? `${foraSla} de ${comSla} fora do prazo` : 'sem pedidos com SLA'}
                    dotClass={`dot--${slaColor}`} barPct={pctSla} barClass={slaColor}
                  />
                  <KpiLoja
                    label="% com ruptura"
                    value={pctRuptura !== null ? pctRuptura.toFixed(1) : '—'}
                    sup={pctRuptura !== null ? ' %' : ''}
                    sub={`${comRuptura} pedido${comRuptura !== 1 ? 's' : ''} com ruptura`}
                    dotClass={`dot--${rupturaColor}`} barPct={pctRuptura} barClass={rupturaColor}
                  />
                  <KpiLoja
                    label="% com erro"
                    value="0.0" sup=" %" sub="0 pedidos com erro"
                    dotClass="dot--green" barPct={0} barClass="green"
                  />
                  <KpiLoja
                    label="% com foto"
                    value={pctFoto !== null ? pctFoto.toFixed(1) : '—'}
                    sup={pctFoto !== null ? ' %' : ''}
                    sub={finalizados > 0 ? `${semFoto} de ${finalizados} sem foto` : 'sem pedidos finalizados'}
                    dotClass={`dot--${fotoColor}`} barPct={pctFoto} barClass={fotoColor}
                  />
                  <KpiLoja
                    label="Total de pedidos"
                    value={String(totalPedidos)} sub="Todos os turnos"
                    dotClass="dot--gray" barPct={100} barClass="gray"
                  />
                  {kpis.avg_tempo_iniciar_min_sla != null && (
                    <KpiLoja
                      label="T. Iniciar Médio"
                      value={kpis.avg_tempo_iniciar_min_sla} sup=" min"
                      sub="Turbo/Fast · criação → picking"
                      dotClass={kpis.avg_tempo_iniciar_min_sla <= 5 ? 'dot--green' : kpis.avg_tempo_iniciar_min_sla <= 10 ? 'dot--yellow' : 'dot--red'}
                      barPct={null} barClass="gray"
                    />
                  )}
                  {kpis.avg_cycle_min_sla != null && (
                    <KpiLoja
                      label="T. Ciclo Médio"
                      value={kpis.avg_cycle_min_sla} sup=" min"
                      sub="Turbo/Fast · picking → packing"
                      dotClass={kpis.avg_cycle_min_sla <= 5 ? 'dot--green' : kpis.avg_cycle_min_sla <= 8 ? 'dot--yellow' : 'dot--red'}
                      barPct={null} barClass="gray"
                    />
                  )}
                </div>

                {dados.tipos && dados.tipos.length > 0 && (
                  <Accordion title="Por tipo de pedido" subtitle={`${fmtPeriodo(dataInicio, dataFim)} · SLA de 5 min aplica-se a Turbo/Express, Fast Delivery e Turbo Shopper`}>
                    <div style={{ overflowX: 'auto', marginTop: 12 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border)' }}>
                            {['Tipo', 'Total', 'SLA 5 min', 'Ruptura', 'Foto', 'T. Iniciar', 'T. Picking', 'T. Packing', 'T. Ciclo'].map(h => (
                              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dados.tipos.map((t, i) => {
                            const pSla  = t.com_sla > 0 ? ((t.dentro_sla / t.com_sla) * 100).toFixed(1) : null
                            const pRup  = t.total   > 0 ? ((t.com_ruptura / t.total) * 100).toFixed(1)  : '0.0'
                            const pFoto = t.finalizados > 0 ? ((t.com_foto / t.finalizados) * 100).toFixed(1) : null
                            const isTurbo  = t.tipo === 'Turbo / Express / Fast' || t.tipo === 'Turbo Shopper'
                            const temSla   = t.com_sla > 0
                            const sC = pSla === null ? '#94a3b8' : Number(pSla) >= 85 ? 'var(--green)' : Number(pSla) >= 70 ? 'var(--yellow)' : 'var(--red)'
                            const rC = Number(pRup) <= 5 ? 'var(--green)' : Number(pRup) <= 15 ? 'var(--yellow)' : 'var(--red)'
                            const fC = pFoto === null ? '#94a3b8' : Number(pFoto) >= 70 ? 'var(--green)' : Number(pFoto) >= 30 ? 'var(--yellow)' : 'var(--red)'
                            const badgeBg = isTurbo ? '#dbeafe'
                              : t.tipo === 'Agendado' || t.tipo === 'Agendado Volume Alto' ? '#f0fdf4'
                              : t.tipo === 'Shopper Agendado' ? '#ecfdf5'
                              : t.tipo === 'Sem classificação' ? '#f1f5f9'
                              : '#f3f4f6'
                            const badgeColor = isTurbo ? '#1d4ed8'
                              : t.tipo === 'Agendado' || t.tipo === 'Agendado Volume Alto' ? '#15803d'
                              : t.tipo === 'Shopper Agendado' ? '#065f46'
                              : t.tipo === 'Sem classificação' ? '#64748b'
                              : '#374151'
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'transparent' : '#fafbfc' }}>
                                <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                                  <span style={{ background: badgeBg, color: badgeColor, borderRadius: 4, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{t.tipo}</span>
                                </td>
                                <td style={{ padding: '10px 12px', fontWeight: 700 }}>{Number(t.total).toLocaleString('pt-BR')}</td>
                                <td style={{ padding: '10px 12px', fontWeight: 700, color: sC }}>
                                  {isTurbo || temSla ? (pSla !== null ? `${pSla}%` : '—') : <span style={{ color: '#94a3b8', fontSize: 12 }}>N/A</span>}
                                </td>
                                <td style={{ padding: '10px 12px', fontWeight: 600, color: rC }}>{pRup}%</td>
                                <td style={{ padding: '10px 12px', fontWeight: 600, color: fC }}>{pFoto !== null ? `${pFoto}%` : '—'}</td>
                                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{t.avg_iniciar_min ?? '—'} min</td>
                                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{t.avg_picking_min ?? '—'} min</td>
                                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{t.avg_packing_min ?? '—'} min</td>
                                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{t.avg_cycle_min ?? '—'} min</td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid var(--border)', background: '#f8f9fc' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 700, fontSize: 12, color: 'var(--text-muted)' }}>TOTAL / GERAL</td>
                            <td style={{ padding: '8px 12px', fontWeight: 700 }}>{totalPedidos.toLocaleString('pt-BR')}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: slaColor }}>
                              {pctSla !== null ? `${pctSla.toFixed(1)}%` : '—'}
                              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>({comSla} com SLA)</span>
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: rupturaColor }}>{pctRuptura !== null ? `${pctRuptura.toFixed(1)}%` : '—'}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: fotoColor }}>{pctFoto !== null ? `${pctFoto.toFixed(1)}%` : '—'}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{kpis.avg_tempo_iniciar_min ?? '—'} min</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{kpis.avg_picking_min ?? '—'} min</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{kpis.avg_packing_min ?? '—'} min</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{kpis.avg_cycle_min ?? '—'} min</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </Accordion>
                )}

                <Accordion title="Performance por turno" subtitle="Toque em um turno para abrir a visão do team leader">
                  <div style={{ marginTop: 8 }}>
                    <TabelaTurnos turnos={dados.turnos} />
                  </div>
                </Accordion>

                <Accordion title="Produtos com maior ruptura" subtitle={`Top ${dados.rupturas?.length ?? 0} · ${fmtPeriodo(dataInicio, dataFim)}`}>
                  <div style={{ marginTop: 8 }}>
                    <TopRupturas rupturas={dados.rupturas} />
                  </div>
                </Accordion>

                <Accordion title="Performance por operador" subtitle="Busque um colaborador para ver seus KPIs · pior SLA primeiro">
                  <div style={{ marginTop: 8 }}>
                    <TabelaOperadores
                      operadores={dados.operadores}
                      busca={filtroOperador}
                      onBuscaChange={setFiltroOperador}
                    />
                  </div>
                </Accordion>

                {(() => {
                  const pedidosFiltrados = filtroOperador
                    ? (dados.pedidos || []).filter(p => p.operador?.toLowerCase().includes(filtroOperador.toLowerCase()))
                    : (dados.pedidos || [])
                  return (
                    <Accordion
                      title={filtroOperador ? `Pedidos de ${filtroOperador}` : 'Pedidos recentes'}
                      subtitle={`${pedidosFiltrados.length} pedidos`}
                      defaultOpen={false}
                    >
                      <div style={{ marginTop: 8 }}>
                        <PedidosRecentes pedidos={pedidosFiltrados} />
                      </div>
                    </Accordion>
                  )
                })()}
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
