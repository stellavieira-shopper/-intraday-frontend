export default function TopRupturas({ rupturas }) {
  if (!rupturas || rupturas.length === 0)
    return <div className="empty-state">Nenhuma ruptura registrada.</div>

  const max = Number(rupturas[0]?.ocorrencias) || 1
  const temEstoque = rupturas.some(r => r.estoque_disponivel !== undefined && r.estoque_disponivel !== null)

  return (
    <div className="top-rupturas">
      {rupturas.map((r, i) => {
        const estDisp = Number(r.estoque_disponivel ?? 0)
        const estoqueColor = !temEstoque ? undefined : estDisp === 0 ? '#dc2626' : estDisp <= 5 ? '#f59e0b' : '#16a34a'
        return (
          <div key={i} className="ruptura-row">
            <div className="ruptura-rank">{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div className="ruptura-nome">{r.descricao || r.sku}</div>
              <div className="ruptura-sku">cód. {r.sku}</div>
            </div>
            <div className="ruptura-bar-wrap">
              <div className="ruptura-bar" style={{ width: `${Math.round((Number(r.ocorrencias) / max) * 100)}%` }} />
            </div>
            <div className="ruptura-count">{r.ocorrencias} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>pedidos</span></div>
            {temEstoque && (
              <div style={{ minWidth: 72, textAlign: 'right', fontSize: 12, fontWeight: 700, color: estoqueColor }}>
                {estDisp} <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>virtual</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
