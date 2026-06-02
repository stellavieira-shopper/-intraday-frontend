import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function semanaLabel(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow  = (jan4.getUTCDay() + 6) % 7
  const mon  = new Date(jan4); mon.setUTCDate(jan4.getUTCDate() - dow + (week - 1) * 7)
  const sun  = new Date(mon);  sun.setUTCDate(mon.getUTCDate() + 6)
  const dd   = d => d.toISOString().split('T')[0].split('-').reverse().slice(0, 2).join('/')
  return `Semana ${week} · ${year} · ${dd(mon)} a ${dd(sun)}`
}

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

function fmtPct(val) {
  if (val == null) return '—'
  return `${(val * 100).toFixed(1)}%`
}

function fmtR(val) {
  return `R$ ${Number(val).toFixed(2).replace('.', ',')}`
}

function pctClass(val, limites) {
  if (val == null) return 'gray'
  const pct = val * 100
  if (pct < limites.critico) return 'critico'
  if (pct < limites.atencao) return 'atencao'
  return 'saudavel'
}

function motivoZero(c) {
  if (!c.assiduidade_ok) return { label: 'Assiduidade', cls: 'perf-motivo--assiduidade' }
  if (c.gate_loja)       return { label: 'Gate SLA',    cls: 'perf-motivo--gate' }
  if (c.gate_foto)       return { label: 'Gate Foto',   cls: 'perf-motivo--gate' }
  if (c.valor_final === 0) return { label: 'Taxa < 95%', cls: 'perf-motivo--taxa' }
  return null
}

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

function ColabsTable({ colaboradores }) {
  const sorted = [...colaboradores].sort((a, b) => {
    const ordemFuncao = { SUPERVISOR: 0, TEAM_LIDER: 1, OPERADOR: 2 }
    const fa = ordemFuncao[a.funcao] ?? 9
    const fb = ordemFuncao[b.funcao] ?? 9
    if (fa !== fb) return fa - fb
    return a.nome.localeCompare(b.nome)
  })

  return (
    <div className="perf-colabs-wrap">
      <table className="perf-colabs-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Função</th>
            <th>Turno</th>
            <th>Taxa ind.</th>
            <th>Rupturas (loja)</th>
            <th>Abast.</th>
            <th>Valor</th>
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
                    {c.funcao === 'TEAM_LIDER' ? 'TL' : c.funcao === 'SUPERVISOR' ? 'SUP' : 'OP'}
                  </span>
                </td>
                <td className="perf-td--turno">{c.turno || '—'}</td>
                <td>{fmtPct(c.taxa_individual)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {c.rupturas > 0
                    ? <span>{c.rupturas} itens · −{fmtR(c.desconto_ruptura)}</span>
                    : '0'
                  }
                </td>
                <td>{c.nota_abast != null ? `${c.nota_abast.toFixed(1)}` : '—'}</td>
                <td className="perf-td--valor">
                  {motivo
                    ? <span className={`perf-motivo ${motivo.cls}`}>{motivo.label}</span>
                    : <strong>{fmtR(c.valor_final)}</strong>
                  }
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function StoreCard({ loja }) {
  const [expandido, setExpandido] = useState(false)
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
        <div className="perf-bonus-total">{gateAtivo ? 'Gate ativo' : fmtR(loja.total_bonus)}</div>
      </div>

      <button
        className="perf-expand-btn"
        onClick={() => setExpandido(e => !e)}
      >
        {expandido ? '▲ Ocultar colaboradores' : `▼ Ver ${loja.total_elegiveis} colaboradores`}
      </button>

      {expandido && <ColabsTable colaboradores={loja.colaboradores} />}
    </div>
  )
}

export default function PerformanceDarkstore({ onVoltar, user, onLogout }) {
  const [semanas, setSemanas]     = useState([])
  const [semana, setSemana]       = useState(null)
  const [lojas, setLojas]         = useState([])
  const [loading, setLoading]     = useState(false)
  const [loadingSem, setLoadingSem] = useState(true)
  const [erro, setErro]           = useState(null)

  useEffect(() => {
    async function carregarSemanas() {
      try {
        const { data } = await axios.get(`${API}/api/intraday/performance/semanas`)
        const lista = data.semanas || []
        setSemanas(lista)
        if (lista.length > 0) setSemana(lista[0])
      } catch (e) {
        setErro(e.response?.data?.erro || e.message)
      } finally {
        setLoadingSem(false)
      }
    }
    carregarSemanas()
  }, [])

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

  const totalElegiveis  = lojas.reduce((a, l) => a + l.total_elegiveis, 0)
  const totalBonificados = lojas.reduce((a, l) => a + l.bonificados, 0)
  const totalBonus       = lojas.reduce((a, l) => a + l.total_bonus, 0)
  const storesComGate    = lojas.filter(l => l.gate_sla_flag || l.gate_foto_flag).length

  function handleSemanaChange(e) {
    const [yr, wk] = e.target.value.split('-').map(Number)
    setSemana({ year_ref: yr, week_ref: wk })
  }

  return (
    <div className="intraday-layout">
      {/* Topbar */}
      <div className="intraday-topbar">
        <div className="intraday-topbar__brand">
          <img src="/shopper-icon.avif" alt="Shopper" className="topbar-icon" />
          <div className="brand-divider" />
          <div>
            <div className="brand-label">INTRADAY</div>
            <div className="brand-title">Performance Darkstore</div>
          </div>
        </div>
        <div className="intraday-topbar__right">
          <button className="btn-voltar" onClick={onVoltar}>← Voltar</button>
          {user && (
            <div className="topbar-user">
              {user.picture && <img src={user.picture} alt={user.name} className="topbar-avatar" referrerPolicy="no-referrer" />}
              <span className="topbar-username">{user.name?.split(' ')[0]}</span>
              <button className="btn-logout" onClick={onLogout} title="Sair">Sair</button>
            </div>
          )}
        </div>
      </div>

      <div className="intraday-content">
        {/* Seletor de semana + filtro de turno */}
        <div className="perf-week-bar">
          <span className="perf-week-bar__label">Semana de referência</span>
          {loadingSem ? (
            <span className="perf-week-bar__loading">Carregando semanas...</span>
          ) : (
            <select
              className="perf-week-select"
              value={semana ? `${semana.year_ref}-${semana.week_ref}` : ''}
              onChange={handleSemanaChange}
            >
              {semanas.map(s => (
                <option key={`${s.year_ref}-${s.week_ref}`} value={`${s.year_ref}-${s.week_ref}`}>
                  {semanaLabel(s.year_ref, s.week_ref)}
                </option>
              ))}
            </select>
          )}
        </div>

        {erro && <div className="error-banner">⚠ {erro}</div>}

        {/* Barra de resumo */}
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
            <div className="perf-summary-item">
              <span className="perf-summary-item__num">{totalBonificados}</span>
              <span className="perf-summary-item__den">/{totalElegiveis}</span>
              <span className="perf-summary-item__lbl">Bonificados</span>
            </div>
            <div className="perf-summary-item perf-summary-item--destaque">
              <span className="perf-summary-item__num">{fmtR(totalBonus)}</span>
              <span className="perf-summary-item__lbl">Total a pagar</span>
            </div>
          </div>
        )}

        {/* Legenda de gates */}
        {lojas.length > 0 && (
          <div className="perf-legend">
            <span className="perf-legend__title">Gates:</span>
            <span className="perf-legend__item">SLA separação {'<'} 80% ou Completo {'<'} 80% → zera loja inteira</span>
            <span className="perf-legend__sep">·</span>
            <span className="perf-legend__item">Foto {'<'} 80% → zera loja inteira</span>
            <span className="perf-legend__sep">·</span>
            <span className="perf-legend__item">Assiduidade → zera individualmente</span>
          </div>
        )}

        {/* Loading */}
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

        {/* Grid de lojas */}
        {lojas.length > 0 && (
          <div className="perf-stores-grid">
            {lojas.map(l => <StoreCard key={l.store_code} loja={l} />)}
          </div>
        )}
      </div>
    </div>
  )
}
