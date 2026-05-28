export default function TopRupturas({ rupturas }) {
  if (!rupturas || rupturas.length === 0)
    return <div className="empty-state">Nenhuma ruptura registrada.</div>

  const max = Number(rupturas[0]?.ocorrencias) || 1

  return (
    <div className="top-rupturas">
      {rupturas.map((r, i) => (
        <div key={i} className="ruptura-row">
          <div className="ruptura-rank">{i + 1}</div>
          <div>
            <div className="ruptura-nome">{r.descricao || r.sku}</div>
            <div className="ruptura-sku">cód. {r.sku}</div>
          </div>
          <div className="ruptura-bar-wrap">
            <div className="ruptura-bar" style={{ width: `${Math.round((Number(r.ocorrencias) / max) * 100)}%` }} />
          </div>
          <div className="ruptura-count">{r.ocorrencias} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>pedidos</span></div>
        </div>
      ))}
    </div>
  )
}
