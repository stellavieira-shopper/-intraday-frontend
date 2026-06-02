function pct(num, den) {
  if (!den || den === 0) return null
  const v = (Number(num || 0) / Number(den)) * 100
  return isNaN(v) ? 0 : v
}

function slaClass(v) {
  if (v === null) return ''
  if (v >= 85) return 'sla-pct--green'
  if (v >= 70) return 'sla-pct--orange'
  return 'sla-pct--red'
}
function slaBarClass(v) {
  if (v === null) return 'sla-bar-fill--gray'
  if (v >= 85) return 'sla-bar-fill--green'
  if (v >= 70) return 'sla-bar-fill--orange'
  return 'sla-bar-fill--red'
}

export default function TabelaTurnos({ turnos }) {
  if (!turnos || turnos.length === 0)
    return <div className="empty-state">Nenhum turno registrado.</div>

  return (
    <div className="table-wrapper">
      <table className="intraday-table">
        <thead>
          <tr>
            <th>Turno</th>
            <th>Pedidos</th>
            <th style={{ minWidth: 160 }}>SLA</th>
            <th>Ruptura</th>
            <th>Erros</th>
            <th>Foto</th>
            <th>T. Iniciar (geral)</th>
            <th>T. Iniciar Turbo</th>
            <th>T. Iniciar Fast</th>
            <th>T. Iniciar Outros</th>
          </tr>
        </thead>
        <tbody>
          {turnos.map((t, i) => {
            const comSla    = Number(t.com_sla)    || 0
            const dentroSla = Number(t.dentro_sla) || 0
            const foraSla   = Number(t.fora_sla)   || 0
            const total     = Number(t.total_pedidos) || 0
            const ruptura   = Number(t.com_ruptura)   || 0
            const finalizados = Number(t.finalizados) || 0

            const pctSla  = pct(dentroSla, comSla)
            const pctRup  = pct(ruptura, total)
            const pctFoto = pct(t.com_foto, finalizados)

            return (
              <tr key={i}>
                <td className="td-nome">
                  <div style={{ fontWeight: 700 }}>{t.turno}</div>
                </td>
                <td className="td-num">{total} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>pedidos</span></td>
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
                <td style={{ color: 'var(--green)', fontWeight: 700 }}>0.0%</td>
                <td style={{ color: pctFoto !== null && pctFoto < 30 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>
                  {pctFoto !== null ? `${pctFoto.toFixed(1)}%` : '—'}
                </td>
                <td style={{ fontWeight: 600 }}>{t.avg_tempo_iniciar_min != null ? `${t.avg_tempo_iniciar_min} min` : '—'}</td>
                <td style={{ color: t.avg_iniciar_turbo_min != null ? (t.avg_iniciar_turbo_min <= 1 ? 'var(--green)' : t.avg_iniciar_turbo_min <= 3 ? 'var(--yellow)' : 'var(--red)') : 'var(--text-dim)' }}>
                  {t.total_turbo > 0 ? (t.avg_iniciar_turbo_min != null ? `${t.avg_iniciar_turbo_min} min` : '—') : <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>N/A</span>}
                </td>
                <td style={{ color: t.avg_iniciar_fast_min != null ? (t.avg_iniciar_fast_min <= 1 ? 'var(--green)' : t.avg_iniciar_fast_min <= 3 ? 'var(--yellow)' : 'var(--red)') : 'var(--text-dim)' }}>
                  {t.total_fast > 0 ? (t.avg_iniciar_fast_min != null ? `${t.avg_iniciar_fast_min} min` : '—') : <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>N/A</span>}
                </td>
                <td style={{ color: 'var(--text-muted)' }}>
                  {t.avg_iniciar_outros_min != null ? `${t.avg_iniciar_outros_min} min` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
