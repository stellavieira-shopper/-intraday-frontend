import { useState, useEffect, useMemo } from 'react'

// ── formatadores ──────────────────────────────────────────────────────────────
const fmtR = v => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtPct = v => v == null ? '—' : `${(Number(v) * 100).toFixed(1)}%`
const fmtPctRaw = v => v == null ? '—' : `${Number(v).toFixed(1)}%`
const fmtX = v => `${Number(v || 0).toFixed(1)}×`

const CARGO = { SUPERVISOR: 'Supervisor', TEAM_LIDER: 'Team Leader', OPERADOR: 'Operador' }

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

function isoWeekDates(weekId) {
  const [y, wPart] = weekId.split('-W')
  const year = parseInt(y, 10), week = parseInt(wPart, 10)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow  = (jan4.getUTCDay() + 6) % 7
  const mon  = new Date(jan4); mon.setUTCDate(jan4.getUTCDate() - dow + (week - 1) * 7)
  const sun  = new Date(mon);  sun.setUTCDate(mon.getUTCDate() + 6)
  const dd   = d => d.toISOString().split('T')[0].split('-').reverse().slice(0, 2).join('/')
  return { label: `Semana ${week} · ${year}`, range: `${dd(mon)} a ${dd(sun)}`, number: week, year }
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
          <GateRow label="Separação"   desc="Pedidos express dentro de 5 min · mín. 80%"   value={fmtPct(snap.taxa_separacao_loja)} passed={sepOk} />
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
  const preGate   = Math.max(bruto - ruptDesc - descErros, 0)
  const bolsoPed  = Number(snap.bolso_pedidos             || 0)
  const valPed    = Number(snap.valor_bonus_pedidos_pre_gate || 0)
  const final      = Number(snap.valor_final_bonus || 0)
  const cargo     = snap.funcao_bucket
  const gateAtivo = snap.gate_loja_80_flag || snap.gate_foto_flag || snap.assiduidade_any_flag

  const pisoPct    = snap.store_code === 'pamplona' ? 80 : 85
  const scopeLabel = cargo === 'SUPERVISOR' ? 'da loja' : cargo === 'TEAM_LIDER' ? 'do turno' : 'individual'
  const faixaRule  = cargo === 'SUPERVISOR' ? `< ${pisoPct}%: R$0 · ${pisoPct}–90%: R$150 · 90–95%: R$200 · ≥95%: R$250`
                   : cargo === 'TEAM_LIDER' ? `< ${pisoPct}%: R$0 · ${pisoPct}–90%: R$100 · 90–95%: R$150 · ≥95%: R$200`
                   : `< ${pisoPct}%: R$0 · ${pisoPct}–90%: R$50 · 90–95%: R$100 · ≥95%: R$150`
  const tetoBase   = cargo === 'SUPERVISOR' ? 440 : cargo === 'TEAM_LIDER' ? 330 : 220
  const propPed    = '100% pedidos'

  if (card === 'teto') return (
    <div>
      <FormulaBox title="Fórmula" formula="Teto = teto do cargo × 100% pedidos"
        applied={`R$ ${tetoBase} × 100% pedidos = ${fmtR(bolsoPed)}`} />
      <CalcRow label="Teto base do cargo" rule="OP = R$220 · TL = R$330 · Supervisor = R$440" value={`R$ ${tetoBase}`} />
      <CalcRow label="Proporção: pedidos" rule={propPed} value={fmtR(bolsoPed)} highlight />
      <CalcRow label="Teto semanal total" value={fmtR(bolsoPed)} total />
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
      <CalcRow label="Desconto por erros de clientes" rule={`${errosNorm} erro(s) normal × R$10,23 + ${errosGrav} grave × R$15,34`} value={`− ${fmtR(descErros)}`} negative={descErros > 0} />
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
      <CalcRow label="Erros normais desta pessoa" rule="1 desconto por pedido com erro — R$10,23/pedido" value={`${errosNorm} pedido(s)`} highlight negative={errosNorm > 0} />
      <CalcRow label="Erros graves desta pessoa" rule="1 desconto por pedido com erro grave — R$15,34/pedido" value={`${errosGrav} pedido(s)`} highlight negative={errosGrav > 0} />
      <CalcRow label="Desconto erros" value={fmtR(descErros)} negative={descErros > 0} />
      <CalcRow label="Total em descontos" value={fmtR(ruptDesc + descErros)} total negative={(ruptDesc + descErros) > 0} />
    </div>
  )

  if (card === 'final') return (
    <div>
      <FormulaBox title="Total efetivamente pago"
        formula="Total = ganho pedidos (se todos os gates aprovados)"
        applied={gateAtivo
          ? `R$0,00 — zerado por gate (${[snap.gate_loja_80_flag && 'SLA', snap.gate_foto_flag && 'Foto', snap.assiduidade_any_flag && 'Assiduidade'].filter(Boolean).join(', ')})`
          : `${fmtR(valPed)} = ${fmtR(final)}`} />
      <CalcRow label="Ganho com pedidos" value={fmtR(valPed)} />
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <SummaryCard title="Teto semanal" value={Number(snap.bolso_pedidos || 0)}
                subtitle={`100% pedidos — R$ ${fmtR(snap.bolso_pedidos)}`}
                active={activeCard === 'teto'} onClick={() => setActiveCard(v => v === 'teto' ? null : 'teto')} />
              <SummaryCard title="Ganho com pedidos" value={snap.valor_bonus_pedidos_pre_gate} prefix="+R$" color="var(--green)"
                subtitle={`Sep ind. ${fmtPctRaw(snap.taxa_separacao_individual * 100)} · Faixa ${fmtR(snap.faixa_salario)}`}
                note={`${fmtX(snap.multiplo_separacao)} sep · ${fmtX(snap.multiplo_completo)} completos`}
                active={activeCard === 'pedidos'} onClick={() => setActiveCard(v => v === 'pedidos' ? null : 'pedidos')} />
              <SummaryCard title="Descontos totais" value={(Number(snap.desconto_ruptura||0)+Number(snap.desconto_erros||0))} prefix="−R$" color="var(--red)"
                subtitle={`Rupturas ${fmtR(snap.desconto_ruptura||0)} + Erros ${fmtR(snap.desconto_erros||0)}`}
                note={`${snap.rupturas_count||0} rupt. (loja) · ${(snap.erros_normais||0)+(snap.erros_graves||0)} erros (pessoal)`}
                active={activeCard === 'descontos'} onClick={() => setActiveCard(v => v === 'descontos' ? null : 'descontos')} />
              <SummaryCard title="Total pago" value={snap.valor_final_bonus}
                subtitle={snap.gate_loja_80_flag || snap.gate_foto_flag || snap.assiduidade_any_flag ? 'Zerado por gate' : `Pedidos ${fmtR(snap.valor_bonus_pedidos_pre_gate)}`}
                active={activeCard === 'final'} onClick={() => setActiveCard(v => v === 'final' ? null : 'final')} />
            </div>

            {/* Painel de cálculo expandido */}
            {activeCard && (
              <Card style={{ borderLeft: '4px solid var(--shopper-red)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    {{ teto: 'Composição do teto semanal', pedidos: 'Cálculo — pedidos', descontos: 'Cálculo — rupturas e descontos', final: 'Total efetivamente pago' }[activeCard]}
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
