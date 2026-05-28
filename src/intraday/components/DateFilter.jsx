import { useState } from 'react'

function spDate(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  return d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

function fmtLabel(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const ATALHOS = [
  { label: 'Hoje',     getRange: () => ({ ini: spDate(0), fim: spDate(0) }) },
  { label: 'Ontem',    getRange: () => ({ ini: spDate(1), fim: spDate(1) }) },
  { label: '7 dias',   getRange: () => ({ ini: spDate(6), fim: spDate(0) }) },
  { label: '30 dias',  getRange: () => ({ ini: spDate(29), fim: spDate(0) }) },
]

/**
 * DateFilter — escolha de data única ou período.
 *
 * Props:
 *   dataInicio {string}  'YYYY-MM-DD'
 *   dataFim    {string}  'YYYY-MM-DD'
 *   onChange   {fn}      ({ dataInicio, dataFim }) => void
 */
export default function DateFilter({ dataInicio, dataFim, onChange }) {
  const isPeriodo = dataInicio !== dataFim
  const [modo, setModo] = useState(isPeriodo ? 'periodo' : 'dia')

  function aplicar(ini, fim) {
    onChange({ dataInicio: ini, dataFim: fim })
  }

  function mudarModo(novoModo) {
    setModo(novoModo)
    if (novoModo === 'dia') {
      // colapsa para a data início
      aplicar(dataInicio, dataInicio)
    }
    // ao abrir "periodo" mantém o mesmo intervalo atual
  }

  function atalho(getRange) {
    const { ini, fim } = getRange()
    if (modo === 'dia') aplicar(ini, fim === ini ? ini : ini) // dia: usa apenas inicio
    else aplicar(ini, fim)
  }

  // Label resumida exibida quando está fechado
  const labelAtual = dataInicio === dataFim
    ? fmtLabel(dataInicio)
    : `${fmtLabel(dataInicio)} → ${fmtLabel(dataFim)}`

  return (
    <div className="date-filter">
      {/* Modo toggle */}
      <div className="date-filter__toggle">
        <button
          className={`df-mode-btn ${modo === 'dia' ? 'df-mode-btn--active' : ''}`}
          onClick={() => mudarModo('dia')}
        >
          📅 Dia
        </button>
        <button
          className={`df-mode-btn ${modo === 'periodo' ? 'df-mode-btn--active' : ''}`}
          onClick={() => mudarModo('periodo')}
        >
          📆 Período
        </button>
      </div>

      {/* Atalhos rápidos */}
      <div className="date-filter__atalhos">
        {ATALHOS.map(a => {
          const { ini, fim } = a.getRange()
          const ativo = modo === 'dia'
            ? dataInicio === ini && dataInicio === dataFim
            : dataInicio === ini && dataFim === fim
          return (
            <button
              key={a.label}
              className={`df-atalho ${ativo ? 'df-atalho--active' : ''}`}
              onClick={() => atalho(a.getRange)}
            >
              {a.label}
            </button>
          )
        })}
      </div>

      {/* Inputs de data */}
      {modo === 'dia' ? (
        <div className="date-filter__inputs">
          <input
            type="date"
            className="date-input"
            value={dataInicio}
            max={spDate(0)}
            onChange={e => aplicar(e.target.value, e.target.value)}
          />
        </div>
      ) : (
        <div className="date-filter__inputs date-filter__inputs--range">
          <input
            type="date"
            className="date-input"
            value={dataInicio}
            max={dataFim}
            onChange={e => aplicar(e.target.value, dataFim)}
          />
          <span className="df-range-sep">→</span>
          <input
            type="date"
            className="date-input"
            value={dataFim}
            min={dataInicio}
            max={spDate(0)}
            onChange={e => aplicar(dataInicio, e.target.value)}
          />
        </div>
      )}

      {/* Label resumida */}
      <div className="date-filter__label">{labelAtual}</div>
    </div>
  )
}
