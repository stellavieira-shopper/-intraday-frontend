import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'

// ── formatadores ──────────────────────────────────────────────────────────────
const fmtR = v => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtPct = v => v == null ? '—' : `${(Number(v) * 100).toFixed(1)}%`
const fmtPctRaw = v => v == null ? '—' : `${Number(v).toFixed(1)}%`
const fmtX = v => `${Number(v || 0).toFixed(1)}×`

const CARGO = { SUPERVISOR: 'Supervisor', TEAM_LIDER: 'Team Leader', OPERADOR: 'Operador' }

function traduzMotivo(motivo) {
  if (!motivo) return 'sem ponto registrado'
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
const TURNO = { MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite' }
const STORE_ALIAS = {
  pamplona:          'Jardins',
  higienopolis:      'Higienópolis',
  'sao caetano':     'São Caetano',
  'vila olimpia':    'Vila Olímpia',
}
const STORE = code => {
  const low = (code || '').toLowerCase()
  if (STORE_ALIAS[low]) return STORE_ALIAS[low]
  return low.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ')
}
// Retorna label da regra de desconto de ruptura pela faixa de taxa_completo_loja
function rupturaFaixaLabel(taxaComPct) {
  if (taxaComPct >= 99) return 'Sem desconto (≥99%)'
  if (taxaComPct >= 98) return 'Faixa 98–99%'
  if (taxaComPct >= 97) return 'Faixa 97–98%'
  if (taxaComPct >= 96) return 'Faixa 96–97%'
  if (taxaComPct >= 95) return 'Faixa 95–96%'
  return 'Sem desconto (< 95% · mult.completo=0)'
}

// Semanas parciais (kickoff ou encerramento antecipado) com datas reais
const WEEK_DATE_OVERRIDES = {
  '2026-W27': { start: '2026-06-29', end: '2026-07-02' },
}

function isoWeekDates(weekId) {
  const [y, wPart] = weekId.split('-W')
  const year = parseInt(y, 10), week = parseInt(wPart, 10)
  if (WEEK_DATE_OVERRIDES[weekId]) {
    const { start, end } = WEEK_DATE_OVERRIDES[weekId]
    const dd = s => s.split('-').reverse().slice(0, 2).join('/')
    return { label: `Semana ${week} · ${year}`, range: `${dd(start)} a ${dd(end)}`, number: week, year }
  }
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow  = (jan4.getUTCDay() + 6) % 7
  const mon  = new Date(jan4); mon.setUTCDate(jan4.getUTCDate() - dow + (week - 1) * 7)
  // Semana Shopper: Sex→Qui (segunda da ISO - 3 dias → quinta = segunda + 3)
  const fri  = new Date(mon);  fri.setUTCDate(mon.getUTCDate() - 3)
  const thu  = new Date(mon);  thu.setUTCDate(mon.getUTCDate() + 3)
  const dd   = d => d.toISOString().split('T')[0].split('-').reverse().slice(0, 2).join('/')
  return { label: `Semana ${week} · ${year}`, range: `${dd(fri)} a ${dd(thu)}`, number: week, year }
}

// ── componentes de UI base ────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
      padding: '20px 24px', ...style
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 14 }}>
      {children}
    </div>
  )
}

function Badge({ ok, children }) {
  const bg = ok ? 'var(--green)' : 'var(--red)'
  return (
    <span style={{
      background: bg + '1a', color: bg, border: `1px solid ${bg}40`,
      borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700,
      whiteSpace: 'nowrap'
    }}>
      {children}
    </span>
  )
}

function GateRow({ label, desc, value, passed }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: passed ? 'var(--green)' : 'var(--red)' }}>{value}</span>
        <Badge ok={passed}>{passed ? 'OK' : 'FALHA'}</Badge>
      </div>
    </div>
  )
}

// ── Pré-requisitos ────────────────────────────────────────────────────────────
function GatesSection({ snap }) {
  const piso   = snap.store_code === 'pamplona' ? 0.80 : 0.85
  const sepOk  = Number(snap.taxa_separacao_loja || 0) >= 0.80
  const comOk  = Number(snap.taxa_completo_loja  || 0) >= 0.80
  // Usa gate_foto_flag do mart — pode ter sido ajustado (ex: desconsiderado manualmente)
  const fotOk  = !snap.gate_foto_flag
  const asdOk  = !snap.assiduidade_any_flag
  const lojaOk    = sepOk && comOk && fotOk
  const sepIndOk  = Number(snap.taxa_separacao_individual || 0) >= piso
  const tudoOk    = lojaOk && asdOk && sepIndOk

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <SectionTitle style={{ margin: 0 }}>Pré-requisitos</SectionTitle>
        <Badge ok={tudoOk}>{tudoOk ? 'Todos atendidos' : 'Há falhas'}</Badge>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
            GATE DA LOJA {lojaOk ? '— Aprovada' : '— Zera todos da loja'}
          </div>
          <GateRow label="Separação"   desc="Taxa de separação da loja · mín. 80%"   value={fmtPct(snap.taxa_separacao_loja)} passed={sepOk} />
          <GateRow label="Completos"   desc="Pedidos sem ruptura · mín. 80%"                value={fmtPct(snap.taxa_completo_loja)}  passed={comOk} />
          <GateRow
            label="Foto"
            desc={!snap.gate_foto_flag && Number(snap.taxa_foto_loja || 0) < 0.80
              ? 'Pedidos com foto na expedição · gate desconsiderado esta semana'
              : 'Pedidos com foto na expedição · mín. 80%'}
            value={snap.taxa_foto_loja > 0 ? fmtPct(snap.taxa_foto_loja) : '—'}
            passed={fotOk}
          />
        </div>
        <div>
          {(() => {
            const taxaInd   = Number(snap.taxa_separacao_individual || 0) * 100
            const faixa     = Number(snap.faixa_salario || 0)
            const cargo     = snap.funcao_bucket
            const pisoPct   = snap.store_code === 'pamplona' ? 80 : 85
            const faixaMax  = cargo === 'SUPERVISOR' ? 250 : cargo === 'TEAM_LIDER' ? 200 : 150
            const faixaMed  = cargo === 'SUPERVISOR' ? 200 : cargo === 'TEAM_LIDER' ? 150 : 100
            const faixaLow  = cargo === 'SUPERVISOR' ? 150 : cargo === 'TEAM_LIDER' ? 100 : 50
            const sepIndOk  = taxaInd >= pisoPct
            const indOk     = asdOk && sepIndOk
            return (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
                  GATE INDIVIDUAL {indOk ? '— Aprovado' : '— Há restrições'}
                </div>
                <GateRow
                  label="Assiduidade"
                  desc={asdOk ? 'Sem falta, atestado, advertência ou suspensão' : `Irregularidade: ${traduzMotivo(snap.motivo_falta)}`}
                  value={asdOk ? '' : 'Bloqueado'}
                  passed={asdOk}
                />
                <GateRow
                  label="Taxa de separação individual"
                  desc={
                    taxaInd >= 95 ? `≥ 95% → faixa máxima R$${faixaMax}`
                    : taxaInd >= 90 ? `90–95% → faixa alta R$${faixaMed}`
                    : taxaInd >= pisoPct ? `${pisoPct}–90% → faixa base R$${faixaLow}`
                    : `< ${pisoPct}% → faixa R$0 — sem bônus de pedidos`
                  }
                  value={`${taxaInd.toFixed(1)}%`}
                  passed={sepIndOk}
                />
              </>
            )
          })()}
        </div>
      </div>
    </Card>
  )
}

// ── Cards de resumo clicáveis ─────────────────────────────────────────────────
function SummaryCard({ title, value, prefix = 'R$', color, subtitle, note, active, onClick }) {
  const borderColor = active ? 'var(--shopper-red)' : 'var(--border)'
  return (
    <div role="button" tabIndex={0} onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick && onClick()}
      style={{
      background: active ? '#1a1f2e' : '#fff',
      border: `2px solid ${borderColor}`,
      borderRadius: 'var(--radius)', padding: '16px', cursor: 'pointer',
      textAlign: 'left', width: '100%', transition: 'all 0.15s',
      boxShadow: active ? '0 4px 16px rgba(0,0,0,0.2)' : 'var(--shadow)'
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
        color: active ? '#94a3b8' : 'var(--text-muted)', marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: active ? '#fff' : (color || 'var(--text)'), lineHeight: 1, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, marginRight: 2 }}>{prefix}</span>
        {Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      {subtitle && <div style={{ fontSize: 11, color: active ? '#94a3b8' : 'var(--text-muted)', lineHeight: 1.4 }}>{subtitle}</div>}
      {note && <div style={{ fontSize: 10, color: active ? '#64748b' : 'var(--text-dim)', marginTop: 6, lineHeight: 1.4 }}>{note}</div>}
      <div style={{ fontSize: 11, color: active ? 'var(--shopper-red)' : 'var(--text-muted)', marginTop: 10, fontWeight: 600 }}>
        {active ? '▲ Fechar' : '▼ Ver cálculo'}
      </div>
    </div>
  )
}

// ── Painel de cálculo expandido ───────────────────────────────────────────────
function CalcRow({ label, rule, value, highlight, total, negative }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '10px 12px',
      background: highlight ? '#f0f7ff' : total ? '#f8f9fc' : 'transparent',
      borderLeft: highlight ? '3px solid var(--blue-light)' : total ? '3px solid var(--text)' : '3px solid transparent',
      borderRadius: 4, marginBottom: 4
    }}>
      <div style={{ flex: 1, paddingRight: 16 }}>
        <div style={{ fontSize: 13, fontWeight: total ? 700 : 600, color: 'var(--text)' }}>{label}</div>
        {rule && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{rule}</div>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, flexShrink: 0,
        color: negative ? 'var(--red)' : highlight || total ? 'var(--blue)' : 'var(--text)' }}>
        {value}
      </div>
    </div>
  )
}

function FormulaBox({ title, formula, applied }) {
  return (
    <div style={{ background: '#f8f9fc', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'monospace', lineHeight: 1.5 }}>{formula}</div>
      {applied && <>
        <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
        <div style={{ fontSize: 12, color: 'var(--blue)', fontFamily: 'monospace', lineHeight: 1.5 }}>{applied}</div>
      </>}
    </div>
  )
}

const API_ABAST = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/intraday'

const DIAS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
function fmtDataDia(dateStr) {
  const str = typeof dateStr === 'string' ? dateStr : (dateStr?.value || String(dateStr)).slice(0, 10)
  const [y, m, d] = str.split('-').map(Number)
  const dt = new Date(Number(y), Number(m) - 1, Number(d))
  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')} (${DIAS_PT[dt.getDay()].toUpperCase()})`
}
function fmtHrs(h) { return h != null ? `${Number(h).toFixed(2)}h` : '—' }
function fmtDeltaMin(seg) {
  if (seg == null) return '—'
  const min = Math.round(Math.abs(Number(seg)) / 60)
  return min === 0 ? '0min' : `${min}min`
}

function DiaAbastCard({ dia }) {
  const hitInd = dia.hit_ind
  const hitCol = dia.hit_col
  const gateOk = dia.gate_ok
  const score  = dia.score_dia
  const deltaSeg = Number(dia.real_seg || 0) - Number(dia.esp_seg || 0)
  const deltaColSeg = Number(dia.turno_real_hrs || 0) * 3600 - Number(dia.turno_esp_hrs || 0) * 3600

  const scorePct = score != null ? Math.round(score * 100) : null
  const scoreColor = scorePct == null ? 'var(--text-muted)' : scorePct === 100 ? 'var(--green)' : scorePct >= 40 ? '#b45309' : 'var(--red)'

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', background: gateOk === false ? '#fafafa' : 'var(--card)', opacity: gateOk === false ? 0.6 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 12 }}>{fmtDataDia(dia.data_ref)}</span>
        {!gateOk && <span style={{ fontSize: 10, background: '#fee2e2', color: '#b91c1c', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>FORA DO GATE</span>}
        {gateOk && dia.termino && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>término {dia.termino}</span>}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
        ❄️ {dia.itens_cong ?? 0} &nbsp;🌿 {dia.itens_flv ?? 0} &nbsp;🛒 {dia.itens_merc ?? 0} &nbsp;· Total: <strong>{dia.qtd_itens ?? 0}</strong>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2px 8px', fontSize: 12, marginBottom: 8 }}>
        <span style={{ color: 'var(--text-muted)' }}>Real</span>
        <span style={{ textAlign: 'right', fontWeight: 600 }}>{fmtHrs(dia.real_hrs)}</span>
        <span style={{ color: 'var(--text-muted)' }}>Esperado</span>
        <span style={{ textAlign: 'right' }}>{fmtHrs(dia.esp_hrs)}</span>
        <span style={{ color: 'var(--text-muted)' }}>Delta ind.</span>
        <span style={{ textAlign: 'right', color: hitInd ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
          {deltaSeg > 0 ? '+' : ''}{fmtDeltaMin(deltaSeg)} {hitInd ? '✓' : '✗'}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>Turno col.</span>
        <span style={{ textAlign: 'right', color: hitCol ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
          {hitCol ? 'Adiantado' : 'Atrasado'} {hitCol ? '✓' : '✗'} ({fmtDeltaMin(deltaColSeg)})
        </span>
      </div>
      {gateOk !== false && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ background: '#eff6ff', borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1d4ed8', marginBottom: 2 }}>Score dia</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor }}>{scorePct != null ? `${scorePct}%` : '—'}</div>
          </div>
          <div style={{ background: '#f0fdf4', borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#15803d', marginBottom: 2 }}>Participação</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>{dia.pct_participacao != null ? `${(Number(dia.pct_participacao) * 100).toFixed(0)}%` : '—'}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function AbastecimentoPanel({ snap, notaAbst, tierAbst, bolsoAbst, valAbst, propAbst }) {
  const [dias, setDias]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!snap.nome || !snap.store_code || !snap.year_ref || !snap.week_ref) { setLoading(false); return }
    axios.get(`${API_ABAST}/performance/abastecimento-diario`, { params: { year_ref: snap.year_ref, week_ref: snap.week_ref, nome: snap.nome, store_code: snap.store_code } })
      .then(r => { setDias(r.data.dias || []); setLoading(false) })
      .catch(e => { console.error('[abast-diario]', e); setLoading(false) })
  }, [snap.nome, snap.store_code, snap.year_ref, snap.week_ref])

  const diasGate = dias ? dias.filter(d => d.gate_ok) : []
  const scoreMedio = diasGate.length > 0
    ? diasGate.reduce((s, d) => s + (d.score_dia || 0), 0) / diasGate.length * 100
    : notaAbst

  return (
    <div>
      <FormulaBox title="Fórmula de abastecimento"
        formula="Score semanal = média dos dias dentro do gate → tier de pagamento × teto abastecimento"
        applied={notaAbst > 0
          ? `Score ${notaAbst.toFixed(1)}% → tier ${(tierAbst * 100).toFixed(0)}% × ${fmtR(bolsoAbst)} = ${fmtR(valAbst)}`
          : `Score ${notaAbst.toFixed(1)}% → abaixo de 70% → R$ 0,00`} />
      <CalcRow label="Score semanal de abastecimento" rule="Média dos dias com gate ≥10% dos itens do turno · 60% hit ind + 40% hit col" value={`${notaAbst.toFixed(1)}%`} highlight />
      <CalcRow label="Tier de pagamento"
        rule="< 70%: 0% · 70–79%: 60% · 80–89%: 80% · 90–96%: 95% · ≥ 97%: 100%"
        value={`${(tierAbst * 100).toFixed(0)}%`}
        highlight={tierAbst > 0} negative={tierAbst === 0} />
      <CalcRow label="Teto do componente abastecimento" rule={propAbst} value={fmtR(bolsoAbst)} />
      <CalcRow label="Ganho com abastecimento" rule="tier × teto" value={fmtR(valAbst)} total />

      <div style={{ marginTop: 20, marginBottom: 8, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
        Histórico por dia da semana
      </div>
      {loading && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando...</div>}
      {!loading && dias && dias.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sem registros de abastecimento para esta semana.</div>}
      {!loading && dias && dias.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {dias.map(d => <DiaAbastCard key={d.data_ref} dia={d} />)}
        </div>
      )}
    </div>
  )
}

function CalcPanel({ snap, card }) {
  const taxaIndiv = Number(snap.taxa_separacao_individual || 0)
  const taxaSep   = Number(snap.taxa_separacao_loja       || 0)
  const taxaCom   = Number(snap.taxa_completo_loja        || 0)
  const faixa     = Number(snap.faixa_salario             || 0)
  const mSep      = Number(snap.multiplo_separacao        || 0)
  const mCom      = Number(snap.multiplo_completo         || 0)
  const fator     = 0.7 * mSep + 0.3 * mCom
  const bruto     = Number(snap.valor_obtido_base         || 0)
  const ruptQtd   = Number(snap.rupturas_count            || 0)
  const ruptDesc  = Number(snap.desconto_ruptura          || 0)
  const ruptFaixa = rupturaFaixaLabel(taxaCom * 100)
  const errosNorm  = Number(snap.erros_normais || 0)
  const errosGrav  = Number(snap.erros_graves  || 0)
  const descErros  = Number(snap.desconto_erros || 0)
  const errosTotal = errosNorm + errosGrav
  const valorObtido = Number(snap.valor_obtido || 0)
  const erroRatio  = valorObtido > 0 ? descErros / valorObtido : 0
  const errosFaixa = errosTotal === 0 ? null
    : erroRatio >= 0.99 ? 'Grave (≥5% dos pedidos) — zera bônus'
    : erroRatio >= 0.74 ? 'Alto (4,5–5% dos pedidos) − 75%'
    : erroRatio >= 0.24 ? 'Leve (3–4,5% dos pedidos) − 25%'
    : erroRatio >= 0.14 ? 'Moderado (1–3% dos pedidos) − 15%'
    : 'Baixo (<1% dos pedidos) − 10%'
  const preGate   = Math.max(bruto - ruptDesc - descErros, 0)
  const bolsoPed  = Number(snap.bolso_pedidos             || 0)
  const bolsoAbst = Number(snap.bolso_abastecimento       || 0)
  const valPed    = Number(snap.valor_bonus_pedidos_pre_gate || 0)
  const valAbst   = Number(snap.valor_bonus_abastecimento_pre_gate || 0)
  const notaAbst  = Number(snap.nota_abastecimento_final  || 0)
  const tierAbst  = Number(snap.pct_pagamento_tier_abastecimento || 0)
  const final      = Number(snap.valor_final_bonus || 0)
  const cargo     = snap.funcao_bucket
  const turno     = (snap.turno_bucket || '').toUpperCase()
  const temAbast  = bolsoAbst > 0
  const gateAtivo = snap.gate_loja_80_flag || snap.gate_foto_flag || snap.assiduidade_any_flag

  const pisoPct    = snap.store_code === 'pamplona' ? 80 : 85
  const scopeLabel = cargo === 'SUPERVISOR' ? 'da loja' : cargo === 'TEAM_LIDER' ? 'do turno' : 'individual'
  const faixaRule  = cargo === 'SUPERVISOR' ? `< ${pisoPct}%: R$0 · ${pisoPct}–90%: R$150 · 90–95%: R$200 · ≥95%: R$250`
                   : cargo === 'TEAM_LIDER' ? `< ${pisoPct}%: R$0 · ${pisoPct}–90%: R$100 · 90–95%: R$150 · ≥95%: R$200`
                   : `< ${pisoPct}%: R$0 · ${pisoPct}–90%: R$50 · 90–95%: R$100 · ≥95%: R$150`
  const tetoBase   = cargo === 'SUPERVISOR' ? 440 : cargo === 'TEAM_LIDER' ? 330 : 220

  // Proporção do bolso por turno/cargo
  const pctPed  = cargo === 'SUPERVISOR' ? 0.50 : turno === 'NOITE' ? 0.40 : 1.00
  const pctAbst = cargo === 'SUPERVISOR' ? 0.50 : turno === 'NOITE' ? 0.60 : 0.00
  const propPed  = cargo === 'SUPERVISOR' ? '50% pedidos' : turno === 'NOITE' ? '40% pedidos' : '100% pedidos'
  const propAbst = cargo === 'SUPERVISOR' ? '50% abastecimento' : turno === 'NOITE' ? '60% abastecimento' : null

  if (card === 'teto') return (
    <div>
      <FormulaBox title="Fórmula" formula={temAbast ? "Teto = teto do cargo × (% pedidos + % abastecimento)" : "Teto = teto do cargo × 100% pedidos"}
        applied={temAbast
          ? `R$ ${tetoBase} × ${Math.round(pctPed*100)}% pedidos = ${fmtR(bolsoPed)} · R$ ${tetoBase} × ${Math.round(pctAbst*100)}% abast = ${fmtR(bolsoAbst)}`
          : `R$ ${tetoBase} × 100% pedidos = ${fmtR(bolsoPed)}`} />
      <CalcRow label="Teto base do cargo" rule="OP = R$220 · TL = R$330 · Supervisor = R$440" value={`R$ ${tetoBase}`} />
      <CalcRow label="Proporção: pedidos" rule={propPed} value={fmtR(bolsoPed)} highlight />
      {temAbast && <CalcRow label="Proporção: abastecimento" rule={propAbst} value={fmtR(bolsoAbst)} highlight />}
      <CalcRow label="Teto semanal total" value={fmtR(bolsoPed + bolsoAbst)} total />
    </div>
  )

  if (card === 'pedidos') return (
    <div>
      <FormulaBox title="Fórmula de pedidos"
        formula="Faixa × (0,7 × mult.sep.loja + 0,3 × mult.completos.loja) − desconto rupturas"
        applied={`R$${fmtR(faixa)} × (0,7×${fmtX(mSep)} + 0,3×${fmtX(mCom)}) − ${fmtR(ruptDesc)} = ${fmtR(Math.max(bruto - ruptDesc, 0))}`} />
      <CalcRow label={`Taxa de separação ${scopeLabel}`} rule={`Define a faixa. ${faixaRule}`} value={fmtPctRaw(taxaIndiv * 100)} highlight />
      <CalcRow label="Faixa base" rule={faixa > 0 ? 'Valor fixo pelo cargo/taxa' : `Abaixo de ${pisoPct}% — faixa zero`} value={fmtR(faixa)} negative={faixa === 0} />
      <CalcRow label="Separação da loja" rule={`< ${pisoPct}%: 0× · ${pisoPct}–95%: 0,8× · 95–98%: 1,5× · ≥98%: 2,0×`} value={`${fmtPctRaw(taxaSep * 100)} → ${fmtX(mSep)}`} highlight />
      <CalcRow label="Completos da loja" rule="< 95%: 0× · 95–98%: 0,8× · 98–99%: 1,5× · ≥99%: 2,0×" value={`${fmtPctRaw(taxaCom * 100)} → ${fmtX(mCom)}`} highlight />
      <CalcRow label="Fator final da loja" rule="0,7 × mult.sep + 0,3 × mult.completos" value={`${fator.toFixed(2)}×`} />
      <CalcRow label="Valor bruto de pedidos" rule="Faixa × fator" value={fmtR(bruto)} />
      <CalcRow label="Desconto por rupturas" rule={`Faixa de completos: ${ruptFaixa}`} value={`− ${fmtR(ruptDesc)}`} negative={ruptDesc > 0} />
      <CalcRow label="Desconto por erros de clientes"
        rule={errosTotal === 0
          ? 'Sem erros no período'
          : `${errosTotal} erro(s) · ${errosFaixa}`}
        value={`− ${fmtR(descErros)}`} negative={descErros > 0} />
      <CalcRow label="Resultado após descontos" value={fmtR(preGate)} total />
      <CalcRow label="Limite do componente (teto pedidos)" rule="Parcela máxima para pedidos" value={fmtR(bolsoPed)} />
      <CalcRow label="Ganho com pedidos" rule="min(resultado, limite)" value={fmtR(valPed)} total />
    </div>
  )

  if (card === 'descontos') return (
    <div>
      <FormulaBox title="Descontos aplicados"
        formula="Total = desconto rupturas + desconto erros de clientes"
        applied={`${fmtR(ruptDesc)} (rupturas) + ${fmtR(descErros)} (erros) = ${fmtR(ruptDesc + descErros)}`} />
      <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '10px 0 4px' }}>Rupturas (escopo da loja)</div>
      <CalcRow label="Rupturas da loja" rule="Todos da loja têm mesmo desconto (por faixa de completos)" value={`${ruptQtd} item(ns)`} highlight negative={ruptQtd > 0} />
      <CalcRow label="Faixa de completos da loja" rule="<95%: zero · 95–96%: OP50/TL75/SUP100 · 96–97%: OP40/TL60/SUP80 · 97–98%: OP30/TL45/SUP60 · 98–99%: OP20/TL30/SUP40 · ≥99%: zero" value={ruptFaixa} highlight />
      <CalcRow label="Desconto rupturas" value={fmtR(ruptDesc)} negative={ruptDesc > 0} />
      <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '10px 0 4px' }}>Erros de clientes (escopo individual)</div>
      <CalcRow label="Erros desta pessoa" rule="Normais + graves considerados" value={`${errosTotal} erro(s)`} highlight negative={errosTotal > 0} />
      <CalcRow label="Faixa de desconto"
        rule="<1%→−10% · 1–3%→−15% · 3–4,5%→−25% · 4,5–5%→−75% · ≥5%→zera"
        value={errosTotal === 0 ? 'Sem erros' : errosFaixa} highlight negative={errosTotal > 0} />
      <CalcRow label="Desconto erros" value={fmtR(descErros)} negative={descErros > 0} />
      <CalcRow label="Total em descontos" value={fmtR(ruptDesc + descErros)} total negative={(ruptDesc + descErros) > 0} />
    </div>
  )

  if (card === 'abastecimento') return (
    <AbastecimentoPanel snap={snap} notaAbst={notaAbst} tierAbst={tierAbst} bolsoAbst={bolsoAbst} valAbst={valAbst} propAbst={propAbst} />
  )

  if (card === 'final') return (
    <div>
      <FormulaBox title="Total efetivamente pago"
        formula={temAbast ? "Total = ganho pedidos + ganho abastecimento (se gates aprovados)" : "Total = ganho pedidos (se todos os gates aprovados)"}
        applied={gateAtivo
          ? `R$0,00 — zerado por gate (${[snap.gate_loja_80_flag && 'SLA', snap.gate_foto_flag && 'Foto', snap.assiduidade_any_flag && 'Assiduidade'].filter(Boolean).join(', ')})`
          : temAbast
            ? `${fmtR(valPed)} (pedidos) + ${fmtR(valAbst)} (abastecimento) = ${fmtR(final)}`
            : `${fmtR(valPed)} = ${fmtR(final)}`} />
      <CalcRow label="Ganho com pedidos" value={fmtR(valPed)} />
      {temAbast && <CalcRow label="Ganho com abastecimento" value={fmtR(valAbst)} />}
      {gateAtivo && <CalcRow label="Gate ativado — bônus zerado" rule={[snap.gate_loja_80_flag && 'Gate da loja: SLA abaixo de 80%', snap.gate_foto_flag && 'Gate de foto: < 80% dos pedidos com foto', snap.assiduidade_any_flag && 'Gate individual: irregularidade de assiduidade'].filter(Boolean).join(' · ')} value="R$ 0,00" negative />}
      <CalcRow label="Total efetivamente pago" value={fmtR(final)} total />
    </div>
  )

  return null
}

// ── Tabela de pedidos turbo/express ──────────────────────────────────────────
function fmtSla(seg) {
  if (seg == null || seg <= 0) return '—'
  const m = Math.floor(seg / 60)
  const s = Math.round(seg % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function TurbosTable({ pedidos }) {
  const list = pedidos || []
  const total   = list.length
  const ok      = list.filter(p => p.dentro_prazo).length
  const pctStr  = total > 0 ? `${((ok / total) * 100).toFixed(1)}%` : '—'

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <SectionTitle style={{ margin: 0 }}>Pedidos turbo / express</SectionTitle>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Pedidos com SLA de 5 minutos — prazo conta para a taxa de separação individual
          </div>
        </div>
        {total > 0 && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: ok / total >= 0.95 ? 'var(--green)' : ok / total >= 0.85 ? 'var(--yellow)' : 'var(--red)' }}>{pctStr}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ok}/{total} dentro do prazo</div>
          </div>
        )}
      </div>
      {total === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nenhum pedido turbo/express nesta semana.</div>
      )}
      {total > 0 && (
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 320, borderRadius: 6, border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['#', 'Pedido', 'Tipo', 'Tempo', 'SLA 5 min'].map(h => (
                  <th key={h} style={{ padding: '6px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderBottom: '2px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'transparent' : '#fafbfc' }}>
                  <td style={{ padding: '7px 12px', color: 'var(--text-dim)', fontSize: 11 }}>{i + 1}</td>
                  <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{p.cod_pedido}</td>
                  <td style={{ padding: '7px 12px' }}>
                    <span style={{ background: p.categoria === 'EXPRESS' ? '#dbeafe' : '#ede9fe', color: p.categoria === 'EXPRESS' ? '#1d4ed8' : '#6d28d9', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                      {p.categoria === 'EXPRESS' ? 'Turbo' : 'Fast Delivery'}
                    </span>
                  </td>
                  <td style={{ padding: '7px 12px', fontWeight: 600, color: p.dentro_prazo ? 'var(--green)' : 'var(--red)' }}>
                    {fmtSla(p.sla_segundos)}
                  </td>
                  <td style={{ padding: '7px 12px' }}>
                    <span style={{ fontWeight: 700, color: p.dentro_prazo ? 'var(--green)' : 'var(--red)' }}>
                      {p.dentro_prazo ? '✓ OK' : '✗ Atrasado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ── Tabela de erros de clientes da pessoa ────────────────────────────────────
function ErrosTable({ erros, totalDescontos }) {
  const list = erros || []
  const penalizados = list.filter(e => e.considerar === 'Considerar').length
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <SectionTitle style={{ margin: 0 }}>Erros registrados</SectionTitle>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {penalizados} com impacto no cálculo desta pessoa.
          </div>
        </div>
        {totalDescontos > 0 && (
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--red)' }}>
            − {Number(totalDescontos).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
      </div>
      {list.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nenhum erro registrado nesta semana.</div>
      )}
      {list.length > 0 && (
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 300, borderRadius: 6, border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {['Data','Pedido','Produto','Considerar','Grave','Responsabilidade','Erro','Link'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((e, i) => {
                const isGrave = ['SIM','GRAVE'].includes((e.grave||'').toUpperCase().trim())
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'transparent' : '#fafbfc' }}>
                    <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{e.data_entrega || '—'}</td>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{e.cod_pedido}</td>
                    <td style={{ padding: '6px 10px', color: 'var(--text)' }}>{e.produto || '—'}</td>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{ background: '#fde8e8', color: '#c0392b', borderRadius: 3, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{e.considerar}</span>
                    </td>
                    <td style={{ padding: '6px 10px', fontWeight: 700, color: isGrave ? 'var(--red)' : 'var(--text-muted)' }}>{e.grave || '—'}</td>
                    <td style={{ padding: '6px 10px', color: 'var(--text)' }}>{e.responsabilidade || '—'}</td>
                    <td style={{ padding: '6px 10px', color: 'var(--text)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.erro}>{e.erro || '—'}</td>
                    <td style={{ padding: '6px 10px' }}>
                      {e.link_drive
                        ? <a href={e.link_drive} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', fontSize: 11 }}>Ver evidência</a>
                        : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ── Tabela de rupturas da loja ────────────────────────────────────────────────
function RupturasTable({ rupturas }) {
  const list = rupturas || []
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <SectionTitle style={{ margin: 0 }}>Rupturas da loja no período</SectionTitle>
        {list.length > 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {list.length} item(ns) único(s) · afeta todos da loja
          </span>
        )}
      </div>
      {list.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nenhuma ruptura registrada para esta loja nesta semana.</div>
      )}
      {list.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            O desconto é fixo por faixa do indicador de completo da loja — não por quantidade de item.
          </div>
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 360, borderRadius: 6, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['#', 'Pedido', 'Produto'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'transparent' : '#fafbfc' }}>
                    <td style={{ padding: '7px 10px', color: 'var(--text-dim)', fontSize: 11 }}>{i + 1}</td>
                    <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{r.cod_pedido}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--text)', fontWeight: 500 }}>{r.cod_produto || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  )
}

// ── Seletor de pessoa com busca por texto ─────────────────────────────────────
function PessoaSelect({ people, value, onChange, selectStyle }) {
  const [busca, setBusca] = useState('')

  const filtrados = busca.trim()
    ? people.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))
    : people

  // Garante que o value do select seja sempre um dos filtrados
  const valueAtual = filtrados.find(p => p._pid === value)
    ? value
    : ''

  return (
    <div style={{ display: 'flex', gap: 6, flex: 1 }}>
      <input
        type="text"
        placeholder="Buscar por nome..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        style={{ ...selectStyle, minWidth: 160, flex: '0 0 auto' }}
      />
      <select
        style={{ ...selectStyle, flex: 1 }}
        value={valueAtual}
        onChange={e => { onChange(e.target.value); setBusca('') }}
      >
        {!valueAtual && <option value="">— selecione —</option>}
        {filtrados.map(p => (
          <option key={p._pid} value={p._pid}>
            {p.nome} · {CARGO[p.funcao_bucket] || p.funcao_bucket}
          </option>
        ))}
      </select>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PerformanceFeedbackPage({ feedbackIndex, weekBundles, onWeekLoad, onBack, initialPersonId, initialWeekId }) {
  const weeks = useMemo(() => (feedbackIndex || []).map(e => {
    const info = isoWeekDates(e.week_id)
    return { id: e.week_id, ...info }
  }), [feedbackIndex])

  const [selWeek,   setSelWeek]   = useState(() => initialWeekId || null)
  const [selStore,  setSelStore]  = useState(() =>
    initialPersonId?.includes('|') ? initialPersonId.split('|')[0] : ''
  )
  const [selTurno,  setSelTurno]  = useState('')
  const [selPerson, setSelPerson] = useState(() => initialPersonId || '')
  const [activeCard, setActiveCard] = useState(null)

  useEffect(() => { if (weeks.length && !selWeek) setSelWeek(initialWeekId || weeks[0].id) }, [weeks])
  useEffect(() => { if (selWeek) onWeekLoad(selWeek) }, [selWeek])
  useEffect(() => { setActiveCard(null) }, [selWeek])

  const bundle    = selWeek ? weekBundles[selWeek] : null
  const snapshots = bundle?.snapshots || []
  const stores    = useMemo(() => [...new Set(snapshots.map(s => s.store_code))].sort(), [snapshots])

  const people = useMemo(() => {
    return snapshots
      .filter(s => !selStore || s.store_code === selStore)
      .filter(s => !selTurno || (s.turno_bucket || '').toUpperCase() === selTurno)
      .map(s => ({ ...s, _pid: `${s.store_code}|${s.nome}` }))
  }, [snapshots, selStore, selTurno])

  // Auto-seleciona primeira pessoa quando a lista muda
  useEffect(() => {
    if (people.length && !people.find(p => p._pid === selPerson))
      setSelPerson(
        (initialPersonId && people.find(p => p._pid === initialPersonId))
          ? initialPersonId
          : people[0]._pid
      )
  }, [people])

  const snap      = people.find(p => p._pid === selPerson) || null
  const weekInfo  = weeks.find(w => w.id === selWeek)

  const selectStyle = {
    padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6,
    background: '#fff', fontSize: 13, color: 'var(--text)', cursor: 'pointer', minWidth: 160
  }

  return (
    <div>
      {/* Barra de filtros */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '10px 32px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {onBack && (
          <button onClick={onBack} style={{
            padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600,
            background: 'var(--bg)', border: '1px solid var(--border)',
            color: 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap'
          }}>
            ‹ Voltar
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Semana</span>
          <select style={selectStyle} value={selWeek || ''} onChange={e => { setSelWeek(e.target.value); setSelStore(''); setSelPerson('') }}>
            {weeks.map(w => <option key={w.id} value={w.id}>{w.label} · {w.range}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Loja</span>
          <select style={selectStyle} value={selStore} onChange={e => { setSelStore(e.target.value); setSelPerson('') }}>
            <option value="">Todas</option>
            {stores.map(s => <option key={s} value={s}>{STORE(s)}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Turno</span>
          <select style={selectStyle} value={selTurno} onChange={e => { setSelTurno(e.target.value); setSelPerson('') }}>
            <option value="">Todos</option>
            <option value="MANHA">Manhã</option>
            <option value="TARDE">Tarde</option>
            <option value="NOITE">Noite</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Pessoa</span>
          <PessoaSelect people={people} value={selPerson} onChange={setSelPerson} selectStyle={selectStyle} />
        </div>
        {snap && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            {STORE(snap.store_code)} · {TURNO[snap.turno_bucket] || snap.turno_bucket || '—'}
          </span>
        )}
      </div>

      <div className="intraday-content">
        {!bundle && <div style={{ color: 'var(--text-muted)', padding: '20px 0' }}>Carregando dados da semana…</div>}

        {bundle && snap && weekInfo && (
          <>
            {/* Cabeçalho da pessoa */}
            <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Feedback semanal de bonificação
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', lineHeight: 1, marginBottom: 8 }}>{snap.nome}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ background: 'var(--blue)1a', color: 'var(--blue)', border: '1px solid var(--blue)40', borderRadius: 4, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                    {CARGO[snap.funcao_bucket] || snap.funcao_bucket}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>·</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{STORE(snap.store_code)}</span>
                  {snap.turno_bucket && <>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>·</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{TURNO[snap.turno_bucket] || snap.turno_bucket}</span>
                  </>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>Período</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>Semana {weekInfo.number} · {weekInfo.year}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{weekInfo.range}</div>
                <div style={{ marginTop: 12 }}>
                  {snap.valor_final_bonus > 0
                    ? <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>{fmtR(snap.valor_final_bonus)}</span>
                    : <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>R$ 0,00 — gate ativo</span>
                  }
                </div>
              </div>
            </Card>

            {/* Pré-requisitos */}
            <GatesSection snap={snap} />

            {/* Cards de cálculo */}
            {(() => {
              const _snap = snap
              const _temAbast = Number(_snap.bolso_abastecimento || 0) > 0
              const _valAbst  = Number(_snap.valor_bonus_abastecimento_pre_gate || 0)
              const _notaAbst = Number(_snap.nota_abastecimento_final || 0)
              const _tierAbst = Number(_snap.pct_pagamento_tier_abastecimento || 0)
              const _cols = _temAbast ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)'
              return (
                <div style={{ display: 'grid', gridTemplateColumns: _cols, gap: 12 }}>
                  <SummaryCard title="Teto semanal"
                    value={Number(_snap.bolso_pedidos || 0) + Number(_snap.bolso_abastecimento || 0)}
                    subtitle={_temAbast ? `40% pedidos ${fmtR(_snap.bolso_pedidos)} · 60% abast ${fmtR(_snap.bolso_abastecimento)}` : `100% pedidos — ${fmtR(_snap.bolso_pedidos)}`}
                    active={activeCard === 'teto'} onClick={() => setActiveCard(v => v === 'teto' ? null : 'teto')} />
                  <SummaryCard title="Ganho com pedidos" value={_snap.valor_bonus_pedidos_pre_gate} prefix="+R$" color="var(--green)"
                    subtitle={`Sep ind. ${fmtPctRaw(_snap.taxa_separacao_individual * 100)} · Faixa ${fmtR(_snap.faixa_salario)}`}
                    note={`${fmtX(_snap.multiplo_separacao)} sep · ${fmtX(_snap.multiplo_completo)} completos`}
                    active={activeCard === 'pedidos'} onClick={() => setActiveCard(v => v === 'pedidos' ? null : 'pedidos')} />
                  {_temAbast && (
                    <SummaryCard title="Ganho com abastecimento" value={_valAbst} prefix="+R$" color="var(--green)"
                      subtitle={`Score ${_notaAbst.toFixed(1)}% → tier ${(_tierAbst * 100).toFixed(0)}%`}
                      note={`Teto abast. ${fmtR(_snap.bolso_abastecimento)}`}
                      active={activeCard === 'abastecimento'} onClick={() => setActiveCard(v => v === 'abastecimento' ? null : 'abastecimento')} />
                  )}
                  <SummaryCard title="Descontos totais" value={(Number(_snap.desconto_ruptura||0)+Number(_snap.desconto_erros||0))} prefix="−R$" color="var(--red)"
                    subtitle={`Rupturas ${fmtR(_snap.desconto_ruptura||0)} + Erros ${fmtR(_snap.desconto_erros||0)}`}
                    note={`${_snap.rupturas_count||0} rupt. (loja) · ${(_snap.erros_normais||0)+(_snap.erros_graves||0)} erros (pessoal)`}
                    active={activeCard === 'descontos'} onClick={() => setActiveCard(v => v === 'descontos' ? null : 'descontos')} />
                  <SummaryCard title="Total pago" value={_snap.valor_final_bonus}
                    subtitle={_snap.gate_loja_80_flag || _snap.gate_foto_flag || _snap.assiduidade_any_flag
                      ? 'Zerado por gate'
                      : _temAbast
                        ? `Pedidos ${fmtR(_snap.valor_bonus_pedidos_pre_gate)} + Abast. ${fmtR(_valAbst)}`
                        : `Pedidos ${fmtR(_snap.valor_bonus_pedidos_pre_gate)}`}
                    active={activeCard === 'final'} onClick={() => setActiveCard(v => v === 'final' ? null : 'final')} />
                </div>
              )
            })()}

            {/* Painel de cálculo expandido */}
            {activeCard && (
              <Card style={{ borderLeft: '4px solid var(--shopper-red)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    {{ teto: 'Composição do teto semanal', pedidos: 'Cálculo — pedidos', abastecimento: 'Cálculo — abastecimento', descontos: 'Cálculo — rupturas e descontos', final: 'Total efetivamente pago' }[activeCard]}
                  </div>
                  <button type="button" onClick={() => setActiveCard(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>Fechar</button>
                </div>
                <CalcPanel snap={snap} card={activeCard} />
              </Card>
            )}

            {/* Pedidos turbo/express */}
            <TurbosTable pedidos={snap.pedidos_turbo || []} />

            {/* Erros de clientes desta pessoa */}
            <ErrosTable erros={(bundle.erros_por_pessoa || {})[`${snap.store_code}|${snap.nome}`] || []}
                        totalDescontos={Number(snap.desconto_erros || 0)} />

            {/* Rupturas da loja */}
            <RupturasTable rupturas={(bundle.rupturas_por_loja || {})[snap.store_code] || []} />
          </>
        )}
      </div>
    </div>
  )
}
