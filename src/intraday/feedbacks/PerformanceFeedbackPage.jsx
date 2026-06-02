import { useState, useEffect, useMemo } from 'react'

// ── formatadores ──────────────────────────────────────────────────────────────
const fmtR = v => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtPct = v => v == null ? '—' : `${(Number(v) * 100).toFixed(1)}%`
const fmtPctRaw = v => v == null ? '—' : `${Number(v).toFixed(1)}%`
const fmtX = v => `${Number(v || 0).toFixed(1)}×`

const CARGO = { SUPERVISOR: 'Supervisor', TEAM_LIDER: 'Team Leader', OPERADOR: 'Operador' }
const TURNO = { MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite' }
const STORE_ALIAS = { pamplona: 'Jardins' }
const STORE = code => {
  const low = (code || '').toLowerCase()
  if (STORE_ALIAS[low]) return STORE_ALIAS[low]
  return low.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ')
}
const UNIT_RUPT = cargo => cargo === 'SUPERVISOR' ? 4 : cargo === 'TEAM_LIDER' ? 3 : 2

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
  const sepOk  = Number(snap.taxa_separacao_loja || 0) >= 0.80
  const comOk  = Number(snap.taxa_completo_loja  || 0) >= 0.80
  // Usa gate_foto_flag do mart — pode ter sido ajustado (ex: desconsiderado manualmente)
  const fotOk  = !snap.gate_foto_flag
  const asdOk  = !snap.assiduidade_any_flag
  const lojaOk    = sepOk && comOk && fotOk
  const sepIndOk  = Number(snap.taxa_separacao_individual || 0) >= 0.95
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
            const faixaMax  = cargo === 'SUPERVISOR' ? 200 : cargo === 'TEAM_LIDER' ? 150 : 100
            const faixaMed  = cargo === 'SUPERVISOR' ? 150 : cargo === 'TEAM_LIDER' ? 100 : 50
            const sepIndOk  = taxaInd >= 95
            const indOk     = asdOk && sepIndOk
            return (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
                  GATE INDIVIDUAL {indOk ? '— Aprovado' : '— Há restrições'}
                </div>
                <GateRow
                  label="Assiduidade"
                  desc={asdOk ? 'Sem falta, atestado, advertência ou suspensão' : `Irregularidade: ${snap.motivo_falta || 'registrada'}`}
                  value={asdOk ? '' : 'Bloqueado'}
                  passed={asdOk}
                />
                <GateRow
                  label="Taxa de separação individual"
                  desc={
                    taxaInd >= 98 ? `≥ 98% → faixa máxima R$${faixaMax}`
                    : taxaInd >= 95 ? `95–98% → faixa intermediária R$${faixaMed}`
                    : `< 95% → faixa R$0 — sem bônus de pedidos`
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
    <button onClick={onClick} style={{
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
    </button>
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
  const ruptUnit  = UNIT_RUPT(snap.funcao_bucket)
  const preGate   = Math.max(bruto - ruptDesc, 0)
  const bolsoPed  = Number(snap.bolso_pedidos             || 0)
  const bolsoAbs  = Number(snap.bolso_abastecimento       || 0)
  const valPed    = Number(snap.valor_bonus_pedidos_pre_gate || 0)
  const valAbs    = Number(snap.valor_bonus_abastecimento_pre_gate || 0)
  const nota      = Number(snap.nota_abastecimento_final         || 0)
  const tier      = Number(snap.pct_pagamento_tier_abastecimento || 0)
  const final     = Number(snap.valor_final_bonus || 0)
  const cargo     = snap.funcao_bucket
  const gateAtivo = snap.gate_loja_80_flag || snap.gate_foto_flag || snap.assiduidade_any_flag

  const scopeLabel = cargo === 'SUPERVISOR' ? 'da loja' : cargo === 'TEAM_LIDER' ? 'do turno' : 'individual'
  const faixaRule  = cargo === 'SUPERVISOR' ? '< 95%: R$0 · 95–98%: R$150 · ≥98%: R$200'
                   : cargo === 'TEAM_LIDER' ? '< 95%: R$0 · 95–98%: R$100 · ≥98%: R$150'
                   : '< 95%: R$0 · 95–98%: R$50 · ≥98%: R$100'
  const absComp    = cargo === 'SUPERVISOR' ? '100% da loja' : cargo === 'TEAM_LIDER' ? '60% turno + 40% loja' : '70% individual + 30% turno'
  const tierLabel  = tier >= 1.0 ? 'Top — 100%' : tier >= 0.95 ? 'Alta — 95%' : tier >= 0.80 ? 'Média — 80%' : tier >= 0.60 ? 'Baixa — 60%' : tier >= 0.40 ? 'Mínima — 40%' : 'Zero — 0%'
  const tetoBase   = cargo === 'SUPERVISOR' ? 440 : cargo === 'TEAM_LIDER' ? 330 : 220
  const propPed    = cargo === 'SUPERVISOR' ? '50% pedidos' : snap.turno_bucket === 'NOITE' ? '30% pedidos' : snap.turno_bucket === 'MANHA' ? '70% pedidos' : '100% pedidos'
  const propAbs    = cargo === 'SUPERVISOR' ? '50% abastecimento' : snap.turno_bucket === 'NOITE' ? '70% abastecimento' : snap.turno_bucket === 'MANHA' ? '30% abastecimento' : '0% abastecimento'

  if (card === 'teto') return (
    <div>
      <FormulaBox title="Fórmula" formula="Teto = teto do cargo × proporção por turno/cargo"
        applied={`R$ ${tetoBase} × (${propPed} + ${propAbs}) = ${fmtR(bolsoPed + bolsoAbs)}`} />
      <CalcRow label="Teto base do cargo" rule="OP = R$220 · TL = R$330 · Supervisor = R$440" value={`R$ ${tetoBase}`} />
      <CalcRow label="Proporção: pedidos" rule={propPed} value={fmtR(bolsoPed)} highlight />
      <CalcRow label="Proporção: abastecimento" rule={propAbs} value={fmtR(bolsoAbs)} highlight />
      <CalcRow label="Teto semanal total" value={fmtR(bolsoPed + bolsoAbs)} total />
    </div>
  )

  if (card === 'pedidos') return (
    <div>
      <FormulaBox title="Fórmula de pedidos"
        formula="Faixa × (0,7 × mult.sep.loja + 0,3 × mult.completos.loja) − desconto rupturas"
        applied={`R$${fmtR(faixa)} × (0,7×${fmtX(mSep)} + 0,3×${fmtX(mCom)}) − ${fmtR(ruptDesc)} = ${fmtR(Math.max(bruto - ruptDesc, 0))}`} />
      <CalcRow label={`Taxa de separação ${scopeLabel}`} rule={`Define a faixa. ${faixaRule}`} value={fmtPctRaw(taxaIndiv * 100)} highlight />
      <CalcRow label="Faixa base" rule={faixa > 0 ? 'Valor fixo pelo cargo/taxa' : 'Abaixo de 95% — faixa zero'} value={fmtR(faixa)} negative={faixa === 0} />
      <CalcRow label="Separação da loja" rule="< 90%: 0× · 90–95%: 0,8× · 95–98%: 1,5× · ≥98%: 2,0×" value={`${fmtPctRaw(taxaSep * 100)} → ${fmtX(mSep)}`} highlight />
      <CalcRow label="Completos da loja" rule="< 95%: 0× · 95–98%: 0,8× · 98–99%: 1,5× · ≥99%: 2,0×" value={`${fmtPctRaw(taxaCom * 100)} → ${fmtX(mCom)}`} highlight />
      <CalcRow label="Fator final da loja" rule="0,7 × mult.sep + 0,3 × mult.completos" value={`${fator.toFixed(2)}×`} />
      <CalcRow label="Valor bruto de pedidos" rule="Faixa × fator" value={fmtR(bruto)} />
      <CalcRow label="Desconto por rupturas" rule={`${ruptQtd} ruptura(s) da loja × R$${ruptUnit}/item`} value={`− ${fmtR(ruptDesc)}`} negative />
      <CalcRow label="Resultado após desconto" value={fmtR(preGate)} total />
      <CalcRow label="Limite do componente (teto pedidos)" rule="Parcela máxima para pedidos" value={fmtR(bolsoPed)} />
      <CalcRow label="Ganho com pedidos" rule="min(resultado, limite)" value={fmtR(valPed)} total />
    </div>
  )

  if (card === 'abastecimento') return (
    <div>
      <FormulaBox title="Fórmula de abastecimento"
        formula={`Nota (0–100) → faixa de pagamento → % × teto — composição: ${absComp}`}
        applied={`Nota ${fmtPctRaw(nota)} → ${tierLabel} → ${fmtPctRaw(tier * 100)} × ${fmtR(bolsoAbs)} = ${fmtR(valAbs)}`} />
      <CalcRow label="Composição da nota" rule={absComp} value="—" />
      <CalcRow label="Nota final de abastecimento" rule="Velocidade UAB/min (80%) + horário de término (20%)" value={fmtPctRaw(nota)} highlight />
      <CalcRow label="Faixa de pagamento" rule="< 60: 0% · 60–70: 40% · 70–80: 60% · 80–90: 80% · 90–97: 95% · ≥97: 100%" value={tierLabel} highlight />
      <CalcRow label="Teto de abastecimento" rule="Parcela máxima reservada" value={fmtR(bolsoAbs)} />
      <CalcRow label="Ganho com abastecimento" rule={`${fmtR(bolsoAbs)} × ${fmtPctRaw(tier * 100)}`} value={fmtR(valAbs)} total />
    </div>
  )

  if (card === 'descontos') return (
    <div>
      <FormulaBox title="Desconto por rupturas"
        formula="Desconto = rupturas da loja (itens únicos) × valor unitário por cargo"
        applied={`${ruptQtd} ruptura(s) × R$${ruptUnit}/item = ${fmtR(ruptDesc)}`} />
      <CalcRow label="Rupturas contabilizadas" rule="Itens únicos (pedido × produto) com ruptura resolvida — toda a loja" value={`${ruptQtd} item(ns)`} highlight negative={ruptQtd > 0} />
      <CalcRow label="Valor unitário" rule="OP: R$2,00 · Team Leader: R$3,00 · Supervisor: R$4,00" value={`R$${ruptUnit},00/item`} />
      <CalcRow label="Escopo" rule="Todos da loja têm o mesmo desconto — rupturas são contadas no nível da loja" value="Loja toda" />
      <CalcRow label="Total em descontos" value={fmtR(ruptDesc)} total negative={ruptDesc > 0} />
    </div>
  )

  if (card === 'final') return (
    <div>
      <FormulaBox title="Total efetivamente pago"
        formula="Total = ganho pedidos + ganho abastecimento (se todos os gates aprovados)"
        applied={gateAtivo
          ? `R$0,00 — zerado por gate (${[snap.gate_loja_80_flag && 'SLA', snap.gate_foto_flag && 'Foto', snap.assiduidade_any_flag && 'Assiduidade'].filter(Boolean).join(', ')})`
          : `${fmtR(valPed)} + ${fmtR(valAbs)} = ${fmtR(final)}`} />
      <CalcRow label="Ganho com pedidos" value={fmtR(valPed)} />
      <CalcRow label="Ganho com abastecimento" value={fmtR(valAbs)} />
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
            <div style={{ fontSize: 20, fontWeight: 800, color: ok === total ? 'var(--green)' : ok / total >= 0.95 ? 'var(--yellow)' : 'var(--red)' }}>{pctStr}</div>
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
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 360, borderRadius: 6, border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['#', 'Pedido', 'Produto', '−OP (R$2)', '−TL (R$3)', '−SUP (R$4)'].map(h => (
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
                  <td style={{ padding: '7px 10px', color: 'var(--red)', fontWeight: 600 }}>−2,00</td>
                  <td style={{ padding: '7px 10px', color: 'var(--red)', fontWeight: 600 }}>−3,00</td>
                  <td style={{ padding: '7px 10px', color: 'var(--red)', fontWeight: 600 }}>−4,00</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PerformanceFeedbackPage({ feedbackIndex, weekBundles, onWeekLoad, onBack }) {
  const weeks = useMemo(() => (feedbackIndex || []).map(e => {
    const info = isoWeekDates(e.week_id)
    return { id: e.week_id, ...info }
  }), [feedbackIndex])

  const [selWeek,   setSelWeek]   = useState(null)
  const [selStore,  setSelStore]  = useState('')
  const [selTurno,  setSelTurno]  = useState('')
  const [selPerson, setSelPerson] = useState('')
  const [activeCard, setActiveCard] = useState(null)

  useEffect(() => { if (weeks.length && !selWeek) setSelWeek(weeks[0].id) }, [weeks])
  useEffect(() => { if (selWeek) onWeekLoad(selWeek) }, [selWeek])
  useEffect(() => { setActiveCard(null) }, [selPerson, selWeek])

  const bundle    = selWeek ? weekBundles[selWeek] : null
  const snapshots = bundle?.snapshots || []
  const stores    = useMemo(() => [...new Set(snapshots.map(s => s.store_code))].sort(), [snapshots])

  const people = useMemo(() => {
    return snapshots
      .filter(s => !selStore || s.store_code === selStore)
      .filter(s => !selTurno || (s.turno_bucket || '').toUpperCase() === selTurno)
      .map(s => ({ ...s, _pid: `${s.store_code}|${s.mat || s.nome}` }))
  }, [snapshots, selStore, selTurno])

  // Auto-seleciona primeira pessoa quando a lista muda
  useEffect(() => {
    if (people.length && !people.find(p => p._pid === selPerson))
      setSelPerson(people[0]._pid)
  }, [people])

  const snap      = people.find(p => p._pid === selPerson) || null
  const weekInfo  = weeks.find(w => w.id === selWeek)

  const selectStyle = {
    padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6,
    background: '#fff', fontSize: 13, color: 'var(--text)', cursor: 'pointer', minWidth: 160
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
            <div className="brand-title">Feedback de Bonificação</div>
          </div>
        </div>
        <div className="intraday-topbar__right">
          <button className="btn-voltar" onClick={onBack}>← Voltar</button>
        </div>
      </div>

      {/* Barra de filtros */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '10px 32px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Pessoa</span>
          <select style={selectStyle} value={selPerson} onChange={e => setSelPerson(e.target.value)}>
            {people.map(p => <option key={p._pid} value={p._pid}>{p.nome} · {CARGO[p.funcao_bucket] || p.funcao_bucket}</option>)}
          </select>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              <SummaryCard title="Teto semanal" value={Number(snap.bolso_pedidos || 0) + Number(snap.bolso_abastecimento || 0)}
                subtitle={`Pedidos ${fmtR(snap.bolso_pedidos)} + Abast. ${fmtR(snap.bolso_abastecimento)}`}
                active={activeCard === 'teto'} onClick={() => setActiveCard(v => v === 'teto' ? null : 'teto')} />
              <SummaryCard title="Ganho com pedidos" value={snap.valor_bonus_pedidos_pre_gate} prefix="+R$" color="var(--green)"
                subtitle={`Sep ind. ${fmtPctRaw(snap.taxa_separacao_individual * 100)} · Faixa ${fmtR(snap.faixa_salario)}`}
                note={`${fmtX(snap.multiplo_separacao)} sep · ${fmtX(snap.multiplo_completo)} completos`}
                active={activeCard === 'pedidos'} onClick={() => setActiveCard(v => v === 'pedidos' ? null : 'pedidos')} />
              <SummaryCard title="Ganho abastecimento" value={snap.valor_bonus_abastecimento_pre_gate} prefix="+R$" color="var(--green)"
                subtitle={`Nota ${fmtPctRaw(snap.nota_abastecimento_final)} → ${fmtPctRaw(snap.pct_pagamento_tier_abastecimento * 100)} do teto`}
                active={activeCard === 'abastecimento'} onClick={() => setActiveCard(v => v === 'abastecimento' ? null : 'abastecimento')} />
              <SummaryCard title="Desconto rupturas" value={snap.desconto_ruptura} prefix="−R$" color="var(--red)"
                subtitle={`${snap.rupturas_count} ruptura(s) × R$${UNIT_RUPT(snap.funcao_bucket)}/item`}
                note="Contagem da loja — afeta todos"
                active={activeCard === 'descontos'} onClick={() => setActiveCard(v => v === 'descontos' ? null : 'descontos')} />
              <SummaryCard title="Total pago" value={snap.valor_final_bonus}
                subtitle={snap.gate_loja_80_flag || snap.gate_foto_flag || snap.assiduidade_any_flag ? 'Zerado por gate' : `${fmtR(snap.valor_bonus_pedidos_pre_gate)} + ${fmtR(snap.valor_bonus_abastecimento_pre_gate)}`}
                active={activeCard === 'final'} onClick={() => setActiveCard(v => v === 'final' ? null : 'final')} />
            </div>

            {/* Painel de cálculo expandido */}
            {activeCard && (
              <Card style={{ borderLeft: '4px solid var(--shopper-red)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    {{ teto: 'Composição do teto semanal', pedidos: 'Cálculo — pedidos', abastecimento: 'Cálculo — abastecimento', descontos: 'Cálculo — rupturas e descontos', final: 'Total efetivamente pago' }[activeCard]}
                  </div>
                  <button onClick={() => setActiveCard(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>Fechar</button>
                </div>
                <CalcPanel snap={snap} card={activeCard} />
              </Card>
            )}

            {/* Pedidos turbo/express */}
            <TurbosTable pedidos={snap.pedidos_turbo || []} />

            {/* Rupturas da loja */}
            <RupturasTable rupturas={(bundle.rupturas_por_loja || {})[snap.store_code] || []} />
          </>
        )}
      </div>
    </div>
  )
}
