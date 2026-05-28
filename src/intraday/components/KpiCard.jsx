export default function KpiCard({ icon, label, value, sub, color = 'blue', small = false }) {
  return (
    <div className={`kpi-card kpi-card--${color}${small ? ' kpi-card--small' : ''}`}>
      {icon && <span className="kpi-card__icon">{icon}</span>}
      <div className="kpi-card__body">
        <div className="kpi-card__value">{value ?? '—'}</div>
        <div className="kpi-card__label">{label}</div>
        {sub && <div className="kpi-card__sub">{sub}</div>}
      </div>
    </div>
  )
}
