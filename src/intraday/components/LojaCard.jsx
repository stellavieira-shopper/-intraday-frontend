import StatusBadge, { calcSaude } from './StatusBadge.jsx'
import { nomeLoja } from '../utils/nomeLoja.js'

function pctVal(num, den) {
  if (!den || den === 0) return null
  return (num / den) * 100
}

function slaColor(pct) {
  if (pct === null) return ''
  if (pct >= 95)  return '--green'
  if (pct >= 92)  return '--orange'
  return '--red'
}

function rupturaColor(pct) {
  if (pct === null) return ''
  if (pct < 2)  return '--green'
  if (pct < 5)  return '--orange'
  return '--red'
}

function fotoColor(pct) {
  if (pct === null) return ''
  if (pct >= 90)  return '--green'
  if (pct >= 80)  return '--orange'
  return '--red'
}

function erroColor(pct) {
  if (pct === null) return '--green'
  if (pct <= 1)   return '--green'
  if (pct <= 3)   return '--orange'
  return '--red'
}

export default function LojaCard({ loja, dataInicio, dataFim, errosPorLoja = {}, onClick }) {
  const saude = calcSaude(loja)
  const nome  = nomeLoja(loja.loja || loja.nome_loja)

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

  const errosSet   = errosPorLoja[loja.loja] || new Set()
  const errosCount = errosSet.size
  const pctErros   = total > 0 ? (errosCount / total) * 100 : null

  const avgIniciar = loja.avg_tempo_iniciar_min != null ? `${loja.avg_tempo_iniciar_min}min` : '—'

  return (
    <div className={`loja-card loja-card--${saude.variant}`} onClick={() => onClick(loja.loja || loja.nome_loja, dataInicio, dataFim)}>
      <div className="loja-card__header">
        <span className="loja-card__nome">{nome}</span>
        <StatusBadge label={saude.label} variant={saude.variant} />
      </div>

      <div className="loja-card__grid">
        <div className="loja-card__metric">
          <span className="loja-card__metric-lbl">SLA 5MIN</span>
          <span className={`loja-card__metric-val loja-card__metric-val${slaColor(pctSla)}`}>
            {pctSla !== null ? `${pctSla.toFixed(1)}%` : '—'}
          </span>
          <span className="loja-card__metric-sub">{comSla > 0 ? `${foraSla} fora` : 'sem dados'}</span>
        </div>

        <div className="loja-card__metric">
          <span className="loja-card__metric-lbl">RUPTURA</span>
          <span className={`loja-card__metric-val loja-card__metric-val${rupturaColor(pctRuptura)}`}>
            {pctRuptura !== null ? `${pctRuptura.toFixed(1)}%` : '—'}
          </span>
          <span className="loja-card__metric-sub">{comRuptura} pedidos</span>
        </div>

        <div className="loja-card__metric">
          <span className="loja-card__metric-lbl">ERROS</span>
          <span className={`loja-card__metric-val loja-card__metric-val${erroColor(pctErros)}`}>
            {pctErros !== null ? `${pctErros.toFixed(1)}%` : '—'}
          </span>
          <span className="loja-card__metric-sub">{errosCount} {errosCount === 1 ? 'pedido' : 'pedidos'}</span>
        </div>

        <div className="loja-card__metric">
          <span className="loja-card__metric-lbl">FOTO</span>
          <span className={`loja-card__metric-val loja-card__metric-val${fotoColor(pctFoto)}`}>
            {pctFoto !== null ? `${pctFoto.toFixed(1)}%` : '—'}
          </span>
          <span className="loja-card__metric-sub">{semFoto > 0 ? `${semFoto} sem foto` : 'todos com foto'}</span>
        </div>
      </div>

      <div className="loja-card__footer">
        <div>
          <div className="loja-card__pedidos-lbl">PEDIDOS</div>
          <div className="loja-card__pedidos-val">{total}</div>
          <div className="loja-card__pedidos-sub">T. iniciar {avgIniciar}</div>
        </div>
        <span className="loja-card__abrir">Abrir loja ›</span>
      </div>
    </div>
  )
}
