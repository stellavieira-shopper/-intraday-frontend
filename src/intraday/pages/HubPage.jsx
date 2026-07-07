function fmtLoja(code) {
  if (!code) return null
  return code.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const ADMIN_EMAILS = ['stella.vieira@shopper.com.br']

export default function HubPage({ user, onIntraday, onFeedbacks, onMeuDesempenho, onAdmin, onLogout }) {
  const isAdmin = ADMIN_EMAILS.includes(user?.email)
  const fullName     = user?.name || ''
  const firstName    = user?.name?.split(' ')[0] || ''
  const loja         = fmtLoja(user?.store_code)
  const isStoreEmail = !!loja && !user?.nome

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
          <div className="hub-greeting">
            {loja
              ? `Bem-vindo ao painel de acompanhamento da loja ${loja}${isStoreEmail ? '' : ','}`
              : 'Bem-vindo,'}
          </div>
          {!isStoreEmail && <div className="hub-name">{fullName}</div>}

          <div className="hub-tiles" style={{ flexWrap: 'wrap' }}>
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

            <button className="hub-tile" onClick={onMeuDesempenho}>
              <div className="hub-tile__icon">📈</div>
              <div className="hub-tile__eyebrow">Performance individual</div>
              <h2 className="hub-tile__title">Feedbacks Diários</h2>
              <p className="hub-tile__desc">
                Taxa de SLA, rupturas e pedidos por colaborador — por dia ou período, em tempo real.
              </p>
              <span className="hub-tile__cta">Ver colaboradores →</span>
            </button>

            {isAdmin && (
              <button className="hub-tile" onClick={onAdmin} style={{ borderStyle: 'dashed', opacity: 0.85 }}>
                <div className="hub-tile__icon">⚙️</div>
                <div className="hub-tile__eyebrow">Área restrita</div>
                <h2 className="hub-tile__title">Administração</h2>
                <p className="hub-tile__desc">
                  Libere ou bloqueie semanas de bonificação para visualização dos colaboradores.
                </p>
                <span className="hub-tile__cta">Gerenciar →</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
