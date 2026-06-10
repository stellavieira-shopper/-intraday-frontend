import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import PerformanceFeedbackPage from '../feedbacks/PerformanceFeedbackPage.jsx'
import '../feedbacks/feedback-mgr.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// ── Helpers ───────────────────────────────────────────────────────────────────
const NOMES = {
  'alto de pinheiros': 'Alto de Pinheiros',
  'barra funda':       'Barra Funda',
  'pamplona':          'Jardins',
  'higienopolis':      'Higienópolis',
  'sao caetano':       'São Caetano',
  'vila olimpia':      'Vila Olímpia',
}
function nomeStore(code) {
  if (!code) return ''
  const low = code.toLowerCase()
  if (NOMES[low]) return NOMES[low]
  return code.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
function fmtPct(val) { return val == null ? '—' : `${(val * 100).toFixed(1)}%` }
function fmtR(val)   { return `R$ ${Number(val).toFixed(2).replace('.', ',')}` }
function pctClass(val, limites) {
  if (val == null) return 'gray'
  const pct = val * 100
  if (pct < limites.critico) return 'critico'
  if (pct < limites.atencao) return 'atencao'
  return 'saudavel'
}
function traduzMotivo(motivo) {
  if (!motivo) return 'irregularidade de assiduidade'
  return motivo.trim()
    .replace(/unjustified absence/gi, 'falta injustificada')
    .replace(/justified absence/gi,   'falta justificada')
    .replace(/partial absence/gi,     'falta parcial')
    .replace(/inss leave/gi,          'licença INSS')
    .replace(/late arrival/gi,        'atraso')
    .replace(/early departure/gi,     'saída antecipada')
    .replace(/\bdelay\b/gi,           'atraso')
    .replace(/\babsence\b/gi,         'falta')
    .replace(/\bsuspension\b/gi,      'suspensão')
    .replace(/\bwarning\b/gi,         'advertência')
    .replace(/medical certificate/gi, 'atestado médico')
    .replace(/\bmedical\b/gi,         'atestado')
    .replace(/\bcertificate\b/gi,     'atestado')
    .replace(/vacation/gi,            'férias')
    .replace(/declaration/gi,         'declaração')
    .replace(/\s*\|\s*/g,             ' · ')
}
function motivoZero(c) {
  if (!c.assiduidade_ok) return { label: traduzMotivo(c.motivo_falta), cls: 'perf-motivo--assiduidade' }
  if (c.gate_loja)       return { label: 'Gate SLA',    cls: 'perf-motivo--gate' }
  if (c.gate_foto)       return { label: 'Gate Foto',   cls: 'perf-motivo--gate' }
  if (c.valor_final === 0) return { label: 'Taxa < 85%', cls: 'perf-motivo--taxa' }
  return null
}
function semanaRangeLabel(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow  = (jan4.getUTCDay() + 6) % 7
  const mon  = new Date(jan4); mon.setUTCDate(jan4.getUTCDate() - dow + (week - 1) * 7)
  const sun  = new Date(mon);  sun.setUTCDate(mon.getUTCDate() + 6)
  const dd   = d => d.toISOString().split('T')[0].split('-').reverse().slice(0, 2).join('/')
  return `${dd(mon)} a ${dd(sun)}`
}
function semanaLabel(year, week) {
  return `Semana ${week} · ${year} · ${semanaRangeLabel(year, week)}`
}
function semanaShortLabel(year, week) {
  return `Sem. ${week} · ${year}`
}
function semanaToWeekId(s) {
  return `${s.year_ref}-W${String(s.week_ref).padStart(2, '0')}`
}

// ── WeekNav — setas prev/next + dropdown central ──────────────────────────────
function WeekNav({ semanas, semana, onChange }) {
  const idx  = semanas.findIndex(s => s.year_ref === semana?.year_ref && s.week_ref === semana?.week_ref)
  const prev = idx < semanas.length - 1 ? semanas[idx + 1] : null
  const next = idx > 0 ? semanas[idx - 1] : null
  if (!semana) return null
  return (
    <div className="fmgr-weeknav">
      <button
        className="fmgr-weeknav-btn"
        disabled={!prev}
        onClick={() => prev && onChange(prev)}
        title={prev ? semanaLabel(prev.year_ref, prev.week_ref) : 'Sem semana anterior'}
      >
        ‹ <span className="fmgr-weeknav-btn-text">{prev ? semanaShortLabel(prev.year_ref, prev.week_ref) : 'Anterior'}</span>
      </button>
      <div className="fmgr-weeknav-current">
        <div className="fmgr-weeknav-eyebrow">Semana selecionada</div>
        <div className="fmgr-weeknav-title">
          <select
            className="fmgr-weeknav-select"
            value={`${semana.year_ref}-${semana.week_ref}`}
            onChange={e => {
              const [yr, wk] = e.target.value.split('-').map(Number)
              const s = semanas.find(s => s.year_ref === yr && s.week_ref === wk)
              if (s) onChange(s)
            }}
          >
            {semanas.map(s => (
              <option key={`${s.year_ref}-${s.week_ref}`} value={`${s.year_ref}-${s.week_ref}`}>
                {semanaLabel(s.year_ref, s.week_ref)}
              </option>
            ))}
          </select>
        </div>
        <div className="fmgr-weeknav-range">{semanaRangeLabel(semana.year_ref, semana.week_ref)}</div>
      </div>
      <button
        className="fmgr-weeknav-btn"
        disabled={!next}
        onClick={() => next && onChange(next)}
        title={next ? semanaLabel(next.year_ref, next.week_ref) : 'Sem semana mais recente'}
      >
        <span className="fmgr-weeknav-btn-text">{next ? semanaShortLabel(next.year_ref, next.week_ref) : 'Próxima'}</span> ›
      </button>
    </div>
  )
}

// ── Componentes visuais ───────────────────────────────────────────────────────
function KpiBar({ label, val, limites }) {
  const cls = pctClass(val, limites)
  const pct = val != null ? Math.min(val * 100, 100) : 0
  return (
    <div className="perf-kpi">
      <div className="perf-kpi__label">{label}</div>
      <div className={`perf-kpi__value perf-kpi__value--${cls}`}>{fmtPct(val)}</div>
      <div className="perf-kpi__bar">
        <div className={`perf-kpi__bar-fill perf-kpi__bar-fill--${cls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function GatePill({ ativo, label }) {
  return (
    <span className={`perf-gate ${ativo ? 'perf-gate--bloqueado' : 'perf-gate--ok'}`}>
      {ativo ? '🔴' : '🟢'} {label}
    </span>
  )
}

// ── Tabela de colaboradores com link para feedback individual ─────────────────
function ColabsTable({ colaboradores, storeCode, onOpenIndividual, weekId }) {
  const CARGO_LABEL = { SUPERVISOR: 'Supervisor', TEAM_LIDER: 'Team Leader', OPERADOR: 'Operador' }
  const sorted = [...colaboradores].sort((a, b) => {
    const ordem = { SUPERVISOR: 0, TEAM_LIDER: 1, OPERADOR: 2 }
    const fa = ordem[a.funcao] ?? 9
    const fb = ordem[b.funcao] ?? 9
    if (fa !== fb) return fa - fb
    return a.nome.localeCompare(b.nome)
  })
  return (
    <div className="perf-colabs-wrap">
      <table className="perf-colabs-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Cargo</th>
            <th>Turno</th>
            <th>Taxa ind.</th>
            <th>Rupturas</th>
            <th>Abast.</th>
            <th>Valor</th>
            {onOpenIndividual && <th></th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => {
            const motivo = motivoZero(c)
            return (
              <tr key={i} className={c.valor_final > 0 ? '' : 'perf-row--zero'}>
                <td className="perf-td--nome">{c.nome}</td>
                <td>
                  <span className={`perf-funcao perf-funcao--${c.funcao?.toLowerCase()}`}>
                    {CARGO_LABEL[c.funcao] || c.funcao || '—'}
                  </span>
                </td>
                <td className="perf-td--turno">{c.turno || '—'}</td>
                <td>{fmtPct(c.taxa_individual)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {c.rupturas > 0 ? <span>{c.rupturas} · −{fmtR(c.desconto_ruptura)}</span> : '0'}
                </td>
                <td>{c.nota_abast != null ? c.nota_abast.toFixed(1) : '—'}</td>
                <td className="perf-td--valor">
                  {motivo
                    ? <span className={`perf-motivo ${motivo.cls}`}>{motivo.label}</span>
                    : <strong>{fmtR(c.valor_final)}</strong>}
                </td>
                {onOpenIndividual && (
                  <td>
                    <button
                      className="fmgr-detail-link"
                      onClick={() => onOpenIndividual(`${storeCode}|${c.mat || c.nome}`, weekId)}
                    >
                      Feedback completo ›
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Breakdown por turno/cargo ─────────────────────────────────────────────────
function BreakdownCard({ title, rows }) {
  const maxValor = Math.max(1, ...rows.map(r => r.valor))
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '16px 20px', flex: '1 1 240px'
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 14 }}>
        {title}
      </div>
      {rows.map(r => (
        <div key={r.key} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{fmtR(r.valor)}</span>
          </div>
          <div style={{ height: 5, background: 'var(--border)', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${(r.valor / maxValor) * 100}%`,
              background: 'var(--blue)', borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            {r.bonificados} de {r.total} receberam
          </div>
        </div>
      ))}
    </div>
  )
}

function BreakdownSection({ colaboradores }) {
  const TURNO_LABEL = { MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite' }
  const CARGO_LABEL = { SUPERVISOR: 'Supervisor', TEAM_LIDER: 'Team Leader', OPERADOR: 'Operador' }

  function calcBreakdown(keyFn, labelFn, order) {
    const map = {}
    colaboradores.forEach(c => {
      const k = keyFn(c)
      if (!map[k]) map[k] = { key: k, label: labelFn(k), total: 0, bonificados: 0, valor: 0 }
      map[k].total++
      if ((c.valor_final || 0) > 0) map[k].bonificados++
      map[k].valor += c.valor_final || 0
    })
    return Object.values(map).sort((a, b) =>
      (order.indexOf(a.key) + 99) - (order.indexOf(b.key) + 99)
    )
  }

  const turnos = calcBreakdown(
    c => c.turno || '_',
    k => TURNO_LABEL[k] || k,
    ['MANHA', 'TARDE', 'NOITE']
  )
  const cargos = calcBreakdown(
    c => c.funcao || '_',
    k => CARGO_LABEL[k] || k,
    ['SUPERVISOR', 'TEAM_LIDER', 'OPERADOR']
  )

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
      <BreakdownCard title="Quebra por turno" rows={turnos} />
      <BreakdownCard title="Quebra por cargo" rows={cargos} />
    </div>
  )
}

// ── Detalhe da loja (drill-down, abre como página separada) ───────────────────
function StoreDetail({ loja, onBack, onOpenIndividual, weekId }) {
  const gateAtivo = loja.gate_sla_flag || loja.gate_foto_flag
  const nome = nomeStore(loja.store_code)
  return (
    <div className="intraday-content">
      <button
        onClick={onBack}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: 'var(--text-muted)', fontWeight: 600,
          padding: '4px 0', marginBottom: 20, display: 'inline-flex',
          alignItems: 'center', gap: 6
        }}
      >
        ‹ Voltar para as lojas
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{nome}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {loja.bonificados} de {loja.total_elegiveis} colaboradores bonificados
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <GatePill ativo={loja.gate_sla_flag} label="SLA" />
          <GatePill ativo={loja.gate_foto_flag} label="Foto" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="perf-store-card" style={{ flex: '1 1 300px', maxWidth: 420 }}>
          <div className="perf-store-card__kpis">
            <KpiBar label="Separação" val={loja.taxa_separacao_loja} limites={{ critico: 80, atencao: 95 }} />
            <KpiBar label="Completo"  val={loja.taxa_completo_loja}  limites={{ critico: 80, atencao: 98 }} />
            <KpiBar label="Foto"      val={loja.taxa_foto_loja}      limites={{ critico: 80, atencao: 90 }} />
          </div>
          <div className="perf-store-card__bonus">
            <div className="perf-bonus-stat">
              <span className="perf-bonus-stat__num">{loja.bonificados}</span>
              <span className="perf-bonus-stat__den">/{loja.total_elegiveis}</span>
              <span className="perf-bonus-stat__lbl">bonificados</span>
            </div>
            <div className="perf-bonus-total">
              {gateAtivo ? 'Gate ativo' : fmtR(loja.total_bonus)}
            </div>
          </div>
        </div>
      </div>

      <BreakdownSection colaboradores={loja.colaboradores || []} />

      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
        Colaboradores elegíveis ({(loja.colaboradores || []).length})
      </div>

      <ColabsTable
        colaboradores={loja.colaboradores || []}
        storeCode={loja.store_code}
        onOpenIndividual={onOpenIndividual}
        weekId={weekId}
      />
    </div>
  )
}

// ── Card da loja (sem expansão inline — abre drill-down) ──────────────────────
function PerfStoreCard({ loja, onOpenStore }) {
  const gateAtivo = loja.gate_sla_flag || loja.gate_foto_flag
  const nome = nomeStore(loja.store_code)
  return (
    <div className={`perf-store-card ${gateAtivo ? 'perf-store-card--gate' : ''}`}>
      <div className="perf-store-card__header">
        <div className="perf-store-card__name">{nome}</div>
        <div className="perf-store-card__gates">
          <GatePill ativo={loja.gate_sla_flag} label="SLA" />
          <GatePill ativo={loja.gate_foto_flag} label="Foto" />
        </div>
      </div>
      <div className="perf-store-card__kpis">
        <KpiBar label="Separação" val={loja.taxa_separacao_loja} limites={{ critico: 80, atencao: 95 }} />
        <KpiBar label="Completo"  val={loja.taxa_completo_loja}  limites={{ critico: 80, atencao: 98 }} />
        <KpiBar label="Foto"      val={loja.taxa_foto_loja}      limites={{ critico: 80, atencao: 90 }} />
      </div>
      <div className="perf-store-card__bonus">
        <div className="perf-bonus-stat">
          <span className="perf-bonus-stat__num">{loja.bonificados}</span>
          <span className="perf-bonus-stat__den">/{loja.total_elegiveis}</span>
          <span className="perf-bonus-stat__lbl">bonificados</span>
        </div>
        <div className="perf-bonus-total">
          {gateAtivo ? 'Gate ativo' : fmtR(loja.total_bonus)}
        </div>
      </div>
      <button className="perf-expand-btn" onClick={() => onOpenStore(loja)}>
        Ver {loja.total_elegiveis} colaboradores →
      </button>
    </div>
  )
}

// ── Visão Geral — conteúdo ────────────────────────────────────────────────────
function VisaoGeralContent({ semanas, onOpenIndividual }) {
  const [semana, setSemana]       = useState(null)
  const [lojas, setLojas]         = useState([])
  const [loading, setLoading]     = useState(false)
  const [erro, setErro]           = useState(null)
  const [drillStore, setDrillStore] = useState(null)

  useEffect(() => {
    if (semanas.length > 0 && !semana) setSemana(semanas[0])
  }, [semanas])

  const buscar = useCallback(async () => {
    if (!semana) return
    setLoading(true)
    setErro(null)
    try {
      const { data } = await axios.get(`${API}/api/intraday/performance/semana`, {
        params: { year_ref: semana.year_ref, week_ref: semana.week_ref }
      })
      setLojas(data.lojas || [])
    } catch (e) {
      setErro(e.response?.data?.erro || e.message)
    } finally {
      setLoading(false)
    }
  }, [semana])

  useEffect(() => { buscar() }, [buscar])
  useEffect(() => { setDrillStore(null) }, [semana])

  const weekId = semana ? semanaToWeekId(semana) : ''
  const totalElegiveis   = lojas.reduce((a, l) => a + l.total_elegiveis, 0)
  const totalBonificados = lojas.reduce((a, l) => a + l.bonificados, 0)
  const totalBonus       = lojas.reduce((a, l) => a + l.total_bonus, 0)
  const storesComGate    = lojas.filter(l => l.gate_sla_flag || l.gate_foto_flag).length

  if (drillStore) {
    return (
      <StoreDetail
        loja={drillStore}
        onBack={() => setDrillStore(null)}
        onOpenIndividual={onOpenIndividual}
        weekId={weekId}
      />
    )
  }

  return (
    <div className="intraday-content">
      <WeekNav semanas={semanas} semana={semana} onChange={setSemana} />

      {erro && <div className="error-banner">⚠ {erro}</div>}

      {lojas.length > 0 && (
        <div className="perf-summary-bar">
          <div className="perf-summary-item">
            <span className="perf-summary-item__num">{lojas.length}</span>
            <span className="perf-summary-item__lbl">Lojas</span>
          </div>
          <div className="perf-summary-item">
            <span className="perf-summary-item__num">{storesComGate}</span>
            <span className="perf-summary-item__lbl">Com gate ativo</span>
          </div>
          {/* Fix: wrap num + den em row para não empilhar */}
          <div className="perf-summary-item">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <span className="perf-summary-item__num">{totalBonificados}</span>
              <span className="perf-summary-item__den">/{totalElegiveis}</span>
            </div>
            <span className="perf-summary-item__lbl">Bonificados</span>
          </div>
          <div className="perf-summary-item perf-summary-item--destaque">
            <span className="perf-summary-item__num">{fmtR(totalBonus)}</span>
            <span className="perf-summary-item__lbl">Total a pagar</span>
          </div>
        </div>
      )}

      {lojas.length > 0 && (
        <div className="perf-legend">
          <span className="perf-legend__title">Gates:</span>
          <span className="perf-legend__item">SLA &lt; 80% ou Completo &lt; 80% → zera loja</span>
          <span className="perf-legend__sep">·</span>
          <span className="perf-legend__item">Foto &lt; 80% → zera loja</span>
          <span className="perf-legend__sep">·</span>
          <span className="perf-legend__item">Assiduidade → zera individualmente</span>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <span>Carregando dados da semana...</span>
        </div>
      )}

      {!loading && lojas.length === 0 && !erro && semana && (
        <div className="empty-state empty-state--full">
          Nenhum dado encontrado para a semana {semana.week_ref}/{semana.year_ref}.
        </div>
      )}

      {lojas.length > 0 && (
        <div className="perf-stores-grid">
          {lojas.map(l => (
            <PerfStoreCard
              key={l.store_code}
              loja={l}
              onOpenStore={setDrillStore}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Compat para PerformanceFeedbackPage ───────────────────────────────────────
function semanasToIndex(semanas) {
  return (semanas || []).map(s => ({
    week_id:      semanaToWeekId(s),
    status:       'published',
    generated_at: new Date().toISOString(),
    people_count: s.people_count || 0,
  }))
}

function parseWeekId(weekId) {
  const [year, wPart] = weekId.split('-W')
  return { year_ref: parseInt(year, 10), week_ref: parseInt(wPart, 10) }
}

// ── FeedbacksPage ─────────────────────────────────────────────────────────────
export default function FeedbacksPage({ onVoltar, user, onLogout }) {
  const [semanas, setSemanas]           = useState([])
  const [weekBundles, setWeekBundles]   = useState({})
  const [loadingSem, setLoadingSem]     = useState(true)
  const [error, setError]               = useState(null)
  const [bundleError, setBundleError]   = useState(null)
  const [activeTab, setActiveTab]       = useState('geral')
  const [drillPerson, setDrillPerson]   = useState(null)
  const firstName = user?.name?.split(' ')[0] || ''

  useEffect(() => {
    async function fetchSemanas() {
      setLoadingSem(true)
      try {
        const res = await axios.get(`${API}/api/intraday/performance/semanas`)
        setSemanas(res.data.semanas || [])
      } catch (e) {
        setError(e.response?.data?.erro || e.message)
      } finally {
        setLoadingSem(false)
      }
    }
    fetchSemanas()
  }, [])

  const handleWeekLoad = useCallback(async (weekId) => {
    if (weekBundles[weekId] && weekBundles[weekId].erros_por_pessoa !== undefined) return
    setBundleError(null)
    try {
      const { year_ref, week_ref } = parseWeekId(weekId)
      const res = await axios.get(`${API}/api/intraday/performance/feedback`, {
        params: { year_ref, week_ref },
      })
      setWeekBundles(prev => ({ ...prev, [weekId]: res.data }))
    } catch (e) {
      setBundleError(e.response?.data?.erro || e.message)
    }
  }, [weekBundles])

  const handleOpenPerson = useCallback((personId, weekId) => {
    setDrillPerson({ personId, weekId })
    setActiveTab('individual')
  }, [])

  if (loadingSem) return <div style={{ padding: '2rem', color: '#888' }}>Carregando…</div>
  if (error)      return <div style={{ padding: '2rem', color: '#c00' }}>Erro: {error}</div>

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
              <div className="brand-label">FEEDBACKS</div>
              <div className="brand-title">Bonificação Semanal</div>
            </div>
          </div>
        </div>

        <div className="feedback-tabs">
          <button
            className={`feedback-tab${activeTab === 'geral' ? ' feedback-tab--active' : ''}`}
            onClick={() => setActiveTab('geral')}
          >
            Visão Geral
          </button>
          <button
            className={`feedback-tab${activeTab === 'individual' ? ' feedback-tab--active' : ''}`}
            onClick={() => { setActiveTab('individual'); setDrillPerson(null) }}
          >
            Feedbacks Individuais
          </button>
        </div>

        <div className="intraday-topbar__right">
          {user && (
            <div className="topbar-user">
              {user.picture && <img src={user.picture} alt={user.name} className="topbar-avatar" referrerPolicy="no-referrer" />}
              <span className="topbar-username">{firstName}</span>
              <button className="btn-logout" onClick={onLogout} title="Sair">Sair</button>
            </div>
          )}
        </div>
      </div>

      {bundleError && (
        <div style={{ padding: '8px 16px', background: '#fde8e8', color: '#c00', fontSize: 12 }}>
          Erro ao carregar semana: {bundleError}
        </div>
      )}

      {activeTab === 'geral' ? (
        <VisaoGeralContent semanas={semanas} onOpenIndividual={handleOpenPerson} />
      ) : (
        <PerformanceFeedbackPage
          feedbackIndex={semanasToIndex(semanas)}
          weekBundles={weekBundles}
          onWeekLoad={handleWeekLoad}
          onBack={() => { setActiveTab('geral'); setDrillPerson(null) }}
          initialPersonId={drillPerson?.personId}
          initialWeekId={drillPerson?.weekId}
        />
      )}
    </div>
  )
}
