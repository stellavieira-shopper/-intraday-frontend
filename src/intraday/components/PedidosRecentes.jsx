const TIPO_LABEL = {
  TURBO_SHOPPER:  'Turbo Shopper',
  SHOPPER_NOW:    'Shopper Now',
  DEFAULT:        'Agendado',
  LARGE_BASKET:   'Agendado Volume Alto',
  FAST_DELIVERY:          'Fast Delivery',
  FAST_DELIVERY_OVERLAP:  'Fast Delivery',
  TURBO:          'Turbo',
  EXPRESS:        'Express',
}

function tipoLabel(tipo) {
  if (!tipo) return '—'
  return TIPO_LABEL[tipo.toUpperCase()] || tipo
}

export default function PedidosRecentes({ pedidos }) {
  if (!pedidos || pedidos.length === 0)
    return <div className="empty-state">Nenhum pedido encontrado.</div>

  return (
    <div className="table-wrapper">
      <table className="intraday-table">
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Tipo</th>
            <th>Operador</th>
            <th>Turno</th>
            <th>SLA</th>
            <th>Ciclo</th>
            <th>Ruptura</th>
            <th>Foto</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((p, i) => {
            const noPrazo  = p.status_sla === 'DENTRO_SLA'
            const atrasado = p.status_sla === 'FORA_SLA'
            const semFoto  = p.foto !== 'Sim'
            const ciclo    = p.cycle_duration_minutes != null ? `${p.cycle_duration_minutes} min` : '—'
            const ehTurbo  = p.eh_turbo === 'SIM'
            const ruptura  = p.teve_ruptura === 'SIM'

            return (
              <tr key={i}>
                <td className="td-nome" style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.cod_pedido}</td>
                <td>
                  <span style={{ fontSize: 11 }}>{tipoLabel(p.tipo_de_pedido)}{ehTurbo ? ' ⚡' : ''}</span>
                </td>
                <td className="td-nome">{p.operador ?? '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.turno ?? '—'}</td>
                <td>
                  {noPrazo  && <span className="badge badge--dentro_sla">NO PRAZO</span>}
                  {atrasado && <span className="badge badge--fora_sla">ATRASADO</span>}
                  {!noPrazo && !atrasado && <span style={{ color: 'var(--text-dim)' }}>—</span>}
                </td>
                <td className="td-num">{ciclo}</td>
                <td style={{ color: ruptura ? 'var(--orange)' : 'var(--green)', fontWeight: 700 }}>
                  {ruptura ? 'Sim' : 'Não'}
                </td>
                <td style={{ color: semFoto ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>
                  {semFoto ? 'Sem foto' : 'Com foto'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
