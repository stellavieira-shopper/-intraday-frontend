import { useState } from 'react'

// Simple arrow-right SVG icon
function ArrowRight() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

// Grid icon
function GridIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

// List icon
function ListIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

// LogOut icon
function LogOutIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export default function HubPage({ user, onIntraday, onFeedbacks, onLogout }) {
  const firstName = user?.name?.split(' ')[0] || 'Usuário'

  return (
    <div className="hub-page">
      <header className="top-bar">
        <img src="/shopper-icon.avif" alt="Shopper" className="top-bar-logo-img" />
        <div className="top-bar-divider" />
        <div className="top-bar-context">
          <span className="top-bar-store">Olá, {firstName}</span>
        </div>
        <div className="top-bar-spacer" />
        {user && (
          <div className="top-bar-user">
            {user.picture && (
              <img src={user.picture} alt={user.name} className="top-bar-avatar" referrerPolicy="no-referrer" />
            )}
            <span className="top-bar-username">{firstName}</span>
          </div>
        )}
        <button className="top-bar-logout" onClick={onLogout} title="Sair">
          <LogOutIcon />
          <span className="top-bar-logout-text">Sair</span>
        </button>
      </header>

      <div className="hub-content">
        <div className="hub-inner">
          <div className="hub-greeting">Onde você quer ir?</div>
          <h1 className="hub-name">{user?.name || 'Bem-vindo'}</h1>

          <div className="hub-tiles">
            <button className="hub-tile" onClick={onIntraday}>
              <div className="hub-tile-icon"><GridIcon /></div>
              <div className="hub-tile-eyebrow">Operação ao longo do dia</div>
              <h2 className="hub-tile-title">Intraday</h2>
              <p className="hub-tile-desc">
                Performance operacional em tempo quase real — SLA, ruptura, foto e tempos
                médios por loja, turno e operador.
              </p>
              <span className="hub-tile-cta">Abrir <ArrowRight /></span>
            </button>

            <button className="hub-tile green" onClick={onFeedbacks}>
              <div className="hub-tile-icon"><ListIcon /></div>
              <div className="hub-tile-eyebrow">Fechamento semanal</div>
              <h2 className="hub-tile-title">Feedbacks de bonificação</h2>
              <p className="hub-tile-desc">
                Relatório semanal auditável de bonificação. Quanto ganhou, quanto perdeu,
                por que, e a memória de cálculo completa.
              </p>
              <span className="hub-tile-cta">Abrir <ArrowRight /></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
