export default function HubPage({ user, onIntraday, onFeedbacks, onLogout }) {
  const firstName = user?.name?.split(' ')[0] || 'Usuário'
  const fullName  = user?.name || 'Bem-vindo'

  return (
    <div className="intraday-layout">
      <div className="intraday-topbar">
        <div className="intraday-topbar__brand">
          <img src="/shopper-icon.avif" alt="Shopper" className="topbar-icon" />
          <div className="brand-divider" />
          <div>
            <div className="brand-label">SHOPPER</div>
            <div className="brand-title">Painel de Gestão</div>
          </div>
        </div>
        <div className="intraday-topbar__right">
          {user && (
            <div className="topbar-user">
              {user.picture && (
                <img src={user.picture} alt={user.name} className="topbar-avatar" referrerPolicy="no-referrer" />
              )}
              <span className="topbar-username">{firstName}</span>
              <button className="btn-logout" onClick={onLogout} title="Sair">Sair</button>
            </div>
          )}
        </div>
      </div>

      <div className="intraday-content">
        <div className="hub-center">
          <div className="hub-greeting">Bem-vindo,</div>
          <div className="hub-name">{fullName}</div>

          <div className="hub-tiles">
            <button className="hub-tile" onClick={onIntraday}>
              <div className="hub-tile__icon">📊</div>
              <div className="hub-tile__eyebrow">Operação ao longo do dia</div>
              <h2 className="hub-tile__title">Intraday</h2>
              <p className="hub-tile__desc">
                Performance operacional em tempo quase real — SLA, ruptura, foto e tempos médios por loja.
              </p>
              <span className="hub-tile__cta">Abrir →</span>
            </button>

            <button className="hub-tile" onClick={onFeedbacks}>
              <div className="hub-tile__icon">💬</div>
              <div className="hub-tile__eyebrow">Fechamento semanal</div>
              <h2 className="hub-tile__title">Feedbacks de bonificação</h2>
              <p className="hub-tile__desc">
                Relatório semanal auditável de bonificação — quanto ganhou, quanto perdeu e por quê.
              </p>
              <span className="hub-tile__cta">Abrir →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
