import { calcSaude } from './StatusBadge.jsx'
import { nomeLoja } from '../utils/nomeLoja.js'

function pctVal(num, den) {
  if (!den || den === 0) return null
  return (num / den) * 100
}

// Map V2 saude variant to V1 status string
function variantToStatus(variant) {
  if (variant === 'saudavel') return 'ok'
  if (variant === 'atencao')  return 'warn'
  return 'bad'
}

function slaStatus(pct) {
  if (pct === null) return 'neutral'
  if (pct >= 95) return 'ok'
  if (pct >= 85) return 'warn'
  return 'bad'
}

function ruptStatus(pct) {
  if (pct === null) return 'neutral'
  if (pct < 2)  return 'ok'
  if (pct < 5)  return 'warn'
  return 'bad'
}

function fotoStatus(pct) {
  if (pct === null) return 'neutral'
  if (pct >= 90) return 'ok'
  if (pct >= 75) return 'warn'
  return 'bad'
}

function ChevronRight() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export default function LojaCard({ loja, dataInicio, dataFim, onClick }) {
  const saude  = calcSaude(loja)
  const nome   = nomeLoja(loja.loja || loja.nome_loja)
  const status = variantToStatus(saude.variant)

  const total      = Number(loja.total_pedidos)       || 0
  const comSla     = Number(loja.pedidos_com_sla)     || 0
  const dentroSla  = Number(loja.pedidos_dentro_sla)  || 0
  const foraSla    = Number(loja.pedidos_fora_sla)    || 0
  const comRuptura = Number(loja.pedidos_com_ruptura) || 0
  const finalizados= Number(loja.pedidos_finalizados) || 0
  const comFoto    = Number(loja.pedidos_com_foto)    || 0
  const semFoto    = finalizados - comFoto

  const pctSla     = pctVal(dentroSla, comSla)
  const pctRuptura = pctVal(comRuptura, total)
  const pctFoto    = pctVal(comFoto, finalizados)

  const avgIniciar = loja.avg_tempo_iniciar_min != null
    ? `T. iniciar ${loja.avg_tempo_iniciar_min}min`
    : null

  const pillLabel = status === 'ok' ? 'Saudável' : status === 'warn' ? 'Atenção' : 'Crítico'

  return (
    <div className="store-card" onClick={() => onClick(loja.loja || loja.nome_loja, dataInicio, dataFim)}>
      <div className="store-card-head">
        <div>
          <div className="store-name">{nome}</div>
        </div>
        <span className={`store-pill ${status}`}>{pillLabel}</span>
      </div>

      <div className="store-metrics">
        <div className="store-metric">
          <span className="store-metric-label">SLA 5min</span>
          <span className={`store-metric-value ${slaStatus(pctSla)}`}>
            {pctSla !== null ? `${pctSla.toFixed(1)}%` : '—'}
          </span>
          <span className="store-metric-raw">{comSla > 0 ? `${foraSla} fora` : 'sem dados'}</span>
        </div>

        <div className="store-metric">
          <span className="store-metric-label">Ruptura</span>
          <span className={`store-metric-value ${ruptStatus(pctRuptura)}`}>
            {pctRuptura !== null ? `${pctRuptura.toFixed(1)}%` : '—'}
          </span>
          <span className="store-metric-raw">{comRuptura} pedidos</span>
        </div>

        <div className="store-metric">
          <span className="store-metric-label">Erros</span>
          <span className="store-metric-value ok">0.0%</span>
          <span className="store-metric-raw">0 pedidos</span>
        </div>

        <div className="store-metric">
          <span className="store-metric-label">Foto</span>
          <span className={`store-metric-value ${fotoStatus(pctFoto)}`}>
            {pctFoto !== null ? `${pctFoto.toFixed(1)}%` : '—'}
          </span>
          <span className="store-metric-raw">{semFoto > 0 ? `${semFoto} sem foto` : 'todos com foto'}</span>
        </div>

        <div className="store-metric">
          <span className="store-metric-label">Pedidos</span>
          <span className="store-metric-value">{total}</span>
          <span className="store-metric-raw">{avgIniciar || 'todos os turnos'}</span>
        </div>
      </div>

      <div className="store-foot">
        <span>{loja.loja || loja.nome_loja || ''}</span>
        <span className="store-foot-cta">Abrir loja <ChevronRight /></span>
      </div>

      {/* V2: colored SLA strip at the bottom of the card */}
      <div className={`store-card-strip ${slaStatus(pctSla)}`} />
    </div>
  )
}
