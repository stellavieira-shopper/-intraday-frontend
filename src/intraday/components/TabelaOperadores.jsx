import { useState } from 'react'

function pct(num, den) {
  if (!den || den === 0) return null
  const v = (Number(num || 0) / Number(den)) * 100
  return isNaN(v) ? 0 : v
}
function slaClass(v) {
  if (v === null) return ''
  if (v >= 95) return 'sla-pct--green'
  if (v >= 92) return 'sla-pct--orange'
  return 'sla-pct--red'
}
function slaBarClass(v) {
  if (v === null) return 'sla-bar-fill--gray'
  if (v >= 95) return 'sla-bar-fill--green'
  if (v >= 92) return 'sla-bar-fill--orange'
  return 'sla-bar-fill--red'
}
function kpiColor(tipo, v) {
  if (v === null) return 'var(--text-muted)'
  if (tipo === 'sla')     return v >= 95 ? 'var(--green)' : v >= 92 ? 'var(--orange)' : 'var(--red)'
  if (tipo === 'ruptura') return v < 2   ? 'var(--green)' : v < 5   ? 'var(--orange)' : 'var(--red)'
  if (tipo === 'foto')    return v >= 90 ? 'var(--green)' : v >= 80 ? 'var(--orange)' : 'var(--red)'
  return 'var(--text)'
}

const TURNOS = ['Todos', 'Manhã', 'Tarde', 'Noite']

export default function TabelaOperadores({ operadores, busca, onBuscaChange }) {
  const [turno, setTurno] = useState('Todos')

  if (!operadores || operadores.length === 0)
    return <div className="empty-state">Nenhum operador registrado.</div>

  const sorted = [...operadores].sort((a, b) => {
    const slaA = Number(a.com_sla) > 0 ? Number(a.dentro_sla) / Number(a.com_sla) : 1
    const slaB = Number(b.com_sla) > 0 ? Number(b.dentro_sla) / Number(b.com_sla) : 1
    return slaA - slaB
  })

  const filtrados = sorted.filter(op => {
    const nomeOk  = !busca || op.operador?.toLowerCase().includes(busca.toLowerCase())
    const turnoOk = turno === 'Todos' || op.turno?.toLowerCase() === turno.toLowerCase()
    return nomeOk && turnoOk
  })

  // Card de KPIs quando há exatamente 1 operador filtrado
  const opSelecionado = filtrados.length === 1 ? filtrados[0] : null

  return (
    <div>
      {/* Barra de filtros */}
      <div className="op-filtros">
        <input
          className="op-busca"
          type="text"
          placeholder="Buscar colaborador..."
          value={busca}
          onChange={e => onBuscaChange(e.target.value)}
        />
        <div className="op-turnos">
          {TURNOS.map(t => (
            <button
              key={t}
              className={`op-turno-btn${turno === t ? ' op-turno-btn--ativo' : ''}`}
              onClick={() => setTurno(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {busca && (
          <button className="op-turno-btn" onClick={() => onBuscaChange('')}>
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Card de KPIs do operador selecionado */}
      {opSelecionado && (() => {
        const op = opSelecionado
        const comSla      = Number(op.com_sla)       || 0
        const dentroSla   = Number(op.dentro_sla)    || 0
        const total       = Number(op.total_pedidos) || 0
        const ruptura     = Number(op.com_ruptura)   || 0
        const finalizados = Number(op.finalizados)   || 0
        const pctSla  = pct(dentroSla, comSla)
        const pctRup  = pct(ruptura, total)
        const pctFoto = pct(op.com_foto, finalizados)

        return (
          <div className="op-kpi-card">
            <div className="op-kpi-card__header">
              <div className="op-kpi-card__nome">{op.operador}</div>
              <div className="op-kpi-card__turno">{op.turno ?? '—'} · {total} pedidos</div>
            </div>
            <div className="op-kpi-card__grid">
              <div className="op-kpi-item">
                <div className="op-kpi-item__lbl">SLA</div>
                <div className="op-kpi-item__val" style={{ color: kpiColor('sla', pctSla) }}>
                  {pctSla !== null ? `${pctSla.toFixed(1)}%` : '—'}
                </div>
                <div className="op-kpi-item__sub">{Number(op.fora_sla) || 0} atrasados</div>
              </div>
              <div className="op-kpi-item">
                <div className="op-kpi-item__lbl">RUPTURA</div>
                <div className="op-kpi-item__val" style={{ color: kpiColor('ruptura', pctRup) }}>
                  {pctRup !== null ? `${pctRup.toFixed(1)}%` : '—'}
                </div>
                <div className="op-kpi-item__sub">{ruptura} pedidos</div>
              </div>
              <div className="op-kpi-item">
                <div className="op-kpi-item__lbl">ERROS</div>
                <div className="op-kpi-item__val" style={{ color: 'var(--green)' }}>0.0%</div>
                <div className="op-kpi-item__sub">0 pedidos</div>
              </div>
              <div className="op-kpi-item">
                <div className="op-kpi-item__lbl">FOTO</div>
                <div className="op-kpi-item__val" style={{ color: kpiColor('foto', pctFoto) }}>
                  {pctFoto !== null ? `${pctFoto.toFixed(1)}%` : '0.0%'}
                </div>
                <div className="op-kpi-item__sub">{finalizados - (Number(op.com_foto) || 0)} sem foto</div>
              </div>
            </div>
          </div>
        )
      })()}

      {filtrados.length === 0
        ? <div className="empty-state">Nenhum operador encontrado.</div>
        : (
          <div className="table-wrapper">
            <table className="intraday-table">
              <thead>
                <tr>
                  <th>Operador</th>
                  <th>Turno</th>
                  <th>Pedidos</th>
                  <th>Atrasados</th>
                  <th style={{ minWidth: 160 }}>SLA</th>
                  <th>Ruptura</th>
                  <th>Erros</th>
                  <th>Foto</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((op, i) => {
                  const comSla      = Number(op.com_sla)       || 0
                  const dentroSla   = Number(op.dentro_sla)    || 0
                  const foraSla     = Number(op.fora_sla)      || 0
                  const total       = Number(op.total_pedidos) || 0
                  const ruptura     = Number(op.com_ruptura)   || 0
                  const finalizados = Number(op.finalizados)   || 0

                  const pctSla  = pct(dentroSla, comSla)
                  const pctRup  = pct(ruptura, total)
                  const pctFoto = pct(op.com_foto, finalizados)

                  return (
                    <tr key={i}>
                      <td className="td-nome">{op.operador}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{op.turno ?? '—'}</td>
                      <td className="td-num">{total} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>pedidos</span></td>
                      <td className={foraSla > 0 ? 'td-atrasado' : ''}>
                        {foraSla > 0 ? foraSla : <span style={{ color: 'var(--green)', fontWeight: 700 }}>0</span>}
                      </td>
                      <td>
                        {comSla > 0 ? (
                          <div className="sla-bar-cell">
                            <div className="sla-bar-wrap">
                              <div className={`sla-bar-fill ${slaBarClass(pctSla)}`} style={{ width: `${pctSla ?? 0}%` }} />
                            </div>
                            <span className={`sla-pct ${slaClass(pctSla)}`}>{pctSla !== null ? `${pctSla.toFixed(1)}%` : '—'}</span>
                          </div>
                        ) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                      </td>
                      <td style={{ color: ruptura > 0 ? 'var(--orange)' : 'var(--green)', fontWeight: 700 }}>
                        {pctRup !== null ? `${pctRup.toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ color: 'var(--green)', fontWeight: 700 }}>0</td>
                      <td style={{ color: pctFoto !== null && pctFoto < 80 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>
                        {pctFoto !== null ? `${pctFoto.toFixed(1)}%` : '0.0%'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}
