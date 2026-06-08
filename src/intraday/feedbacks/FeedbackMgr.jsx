import React, {
  useMemo as useMemoFMgr,
  useState as useStateFMgr,
  useEffect as useEffectFMgr,
} from 'react'
import Icon from '../components/Icon'
import * as FeedbackUtils from './FeedbackData'
import './feedback-mgr.css'

// ── formatters ───────────────────────────────────────────────────────────────
const fmtMoneyFMgr = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPctFMgr = (v) =>
  (v == null ? '—' : `${Number(v).toFixed(1)}%`);

const fmtIntFMgr = (v) =>
  Number(v || 0).toLocaleString('pt-BR');

// ── role → short label ───────────────────────────────────────────────────────
const ROLE_SHORT = {
  operador: 'Operador',
  team_leader: 'Team leader',
  supervisor: 'Supervisor',
};

const SHIFT_LABEL = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

// ── tone helpers ─────────────────────────────────────────────────────────────
const slaToneFMgr = (v) => {
  if (v == null) return 'neutral';
  if (v >= 95) return 'ok';
  if (v >= 80) return 'warn';
  return 'bad';
};

// ── aggregation: snapshots → store summaries ─────────────────────────────────
function aggregateStoresFMgr(snapshots) {
  const byStore = {};
  (snapshots || []).forEach((snap) => {
    const storeId = snap.identity.store_id;
    if (!byStore[storeId]) {
      byStore[storeId] = {
        storeId,
        storeName: snap.identity.store_name || storeId,
        people: [],
        totalPago: 0,
        elegiveis: 0,
        receberam: 0,
        slaSep: snap.orders ? snap.orders.store_separation_numeric : null,
        slaCom: snap.orders ? snap.orders.store_completes_numeric : null,
        gateLojaBlocked: false,
        gateLojaReason: null,
        totalDescontos: 0,
        maxPossivel: 0,
      };
    }
    const st = byStore[storeId];
    const valor = (snap.summary && snap.summary.bonus_final) || 0;
    const desc  = (snap.summary && snap.summary.discounts_total) || 0;
    const max   = (snap.summary && snap.summary.max_possible_total) || 0;

    const gatesStore = (snap.prerequisites && snap.prerequisites.store) || [];
    const gatesIndividual = (snap.prerequisites && snap.prerequisites.individual) || [];
    const gatesComponent = (snap.prerequisites && snap.prerequisites.component) || [];

    const failedStore = gatesStore.filter((g) => g.status !== 'ok');
    if (failedStore.length && !st.gateLojaBlocked) {
      st.gateLojaBlocked = true;
      st.gateLojaReason = failedStore[0].label;
    }

    st.people.push({
      personId: snap.identity.person_id,
      name: snap.identity.name,
      role: snap.identity.role,
      roleLabel: snap.identity.role_label || ROLE_SHORT[snap.identity.role] || snap.identity.role,
      shiftId: snap.identity.shift_id || null,
      shiftLabel: snap.identity.shift_label || (snap.identity.shift_id ? SHIFT_LABEL[snap.identity.shift_id] : ''),
      valorPago: valor,
      descontos: desc,
      maxPossivel: max,
      ordersPaid: (snap.summary && snap.summary.orders_paid) || 0,
      supplyPaid: (snap.summary && snap.summary.supply_paid) || 0,
      mainRate: snap.orders ? snap.orders.main_rate_numeric : null,
      gatesStore,
      gatesIndividual,
      gatesComponent,
    });
    st.totalPago     += valor;
    st.elegiveis     += 1;
    st.totalDescontos += desc;
    st.maxPossivel    += max;
    if (valor > 0) st.receberam += 1;
  });

  return Object.values(byStore);
}

// ── reason that zeroed a person ──────────────────────────────────────────────
//   Returns the *specific* gate label so the manager view never just says "Loja".
function personReasonFMgr(person) {
  const sg = (person.gatesStore || []).find((g) => g.status !== 'ok');
  if (sg) return { label: sg.label, kind: 'store' };
  const ig = (person.gatesIndividual || []).find((g) => g.status !== 'ok' && g.status !== 'assumed_ok');
  if (ig) {
    // Use the detractor sub-type when available (Falta / Advertência / …)
    const detail = (ig.details && ig.details[0]) ? `${ig.label}: ${ig.details[0]}` : ig.label;
    return { label: detail, kind: 'individual' };
  }
  const cg = (person.gatesComponent || []).find((g) => g.status === 'failed_component_zero');
  if (cg) return { label: cg.label, kind: 'component' };
  return null;
}

// ── top KPIs ─────────────────────────────────────────────────────────────────
function MgrKpiStrip({ stores }) {
  const totalPago     = stores.reduce((s, st) => s + st.totalPago, 0);
  const totalElegiv   = stores.reduce((s, st) => s + st.elegiveis, 0);
  const totalReceb    = stores.reduce((s, st) => s + st.receberam, 0);
  const tetoTotal     = stores.reduce((s, st) => s + st.maxPossivel, 0);
  const lojasComBonus = stores.filter((s) => s.totalPago > 0).length;
  const lojasZeradas  = stores.filter((s) => s.totalPago === 0).length;

  // main reason among zeroed people — counted by SPECIFIC gate label
  const reasons = {};
  stores.forEach((st) => {
    st.people.forEach((p) => {
      if (p.valorPago === 0) {
        const r = personReasonFMgr(p);
        if (r) {
          if (!reasons[r.label]) reasons[r.label] = { label: r.label, kind: r.kind, count: 0 };
          reasons[r.label].count += 1;
        }
      }
    });
  });
  const reasonsSorted = Object.values(reasons).sort((a, b) => b.count - a.count);
  const topReason = reasonsSorted[0];
  const totalZeroed = totalElegiv - totalReceb;

  const pctReceberam = totalElegiv ? (totalReceb / totalElegiv) * 100 : 0;
  const pctTeto      = tetoTotal   ? (totalPago / tetoTotal)   * 100 : 0;

  return (
    <div className="fmgr-kpi-strip">
      <div className="fmgr-kpi fmgr-kpi-primary">
        <span className="fmgr-kpi-label">Total pago na semana</span>
        <span className="fmgr-kpi-value">
          <span className="fmgr-kpi-currency">R$</span> {fmtMoneyFMgr(totalPago)}
        </span>
        <span className="fmgr-kpi-foot">
          <strong>{fmtPctFMgr(pctTeto)}</strong> de um teto de <strong>R$ {fmtMoneyFMgr(tetoTotal)}</strong>
        </span>
      </div>

      <div className="fmgr-kpi">
        <span className="fmgr-kpi-label">Pessoas que receberam</span>
        <span className="fmgr-kpi-value">
          {fmtIntFMgr(totalReceb)}<span className="fmgr-kpi-of"> / {fmtIntFMgr(totalElegiv)}</span>
        </span>
        <span className="fmgr-kpi-foot">
          <strong>{fmtPctFMgr(pctReceberam)}</strong> dos elegíveis ganharam bônus
        </span>
      </div>

      <div className="fmgr-kpi">
        <span className="fmgr-kpi-label">Lojas com bônus</span>
        <span className="fmgr-kpi-value">
          {fmtIntFMgr(lojasComBonus)}<span className="fmgr-kpi-of"> / {fmtIntFMgr(stores.length)}</span>
        </span>
        <span className="fmgr-kpi-foot">
          <strong>{fmtIntFMgr(lojasZeradas)}</strong> loja{lojasZeradas !== 1 ? 's' : ''} zerada{lojasZeradas !== 1 ? 's' : ''} por gate
        </span>
      </div>

      <div className="fmgr-kpi">
        <span className="fmgr-kpi-label">Principal motivo de zeragem</span>
        <span className="fmgr-kpi-value fmgr-kpi-value--text">
          {topReason ? topReason.label : '—'}
        </span>
        <span className="fmgr-kpi-foot">
          {topReason
            ? <><strong>{fmtIntFMgr(topReason.count)}</strong> de <strong>{fmtIntFMgr(totalZeroed)}</strong> pessoa{totalZeroed !== 1 ? 's' : ''} zerada{totalZeroed !== 1 ? 's' : ''}{reasonsSorted.length > 1 ? ` · +${reasonsSorted.length - 1} outro${reasonsSorted.length - 1 !== 1 ? 's' : ''} motivo${reasonsSorted.length - 1 !== 1 ? 's' : ''}` : ''}</>
            : 'Sem ocorrências'}
        </span>
      </div>
    </div>
  );
}

// ── breakdown: shifts + roles (overview) ─────────────────────────────────────
const ROLE_ORDER_FMGR = ['supervisor', 'team_leader', 'operador'];

function MgrBreakdownSection({ stores }) {
  // turno
  const byShift = {};
  stores.forEach((st) => {
    st.people.forEach((p) => {
      const k = p.shiftId || '_none';
      if (!byShift[k]) byShift[k] = { id: k, label: p.shiftLabel || 'Sem turno', pago: 0, receb: 0, total: 0 };
      byShift[k].pago  += p.valorPago;
      byShift[k].total += 1;
      if (p.valorPago > 0) byShift[k].receb += 1;
    });
  });
  const SHIFT_ORDER = ['manha', 'tarde', 'noite', '_none'];
  const shifts = Object.values(byShift).sort((a, b) =>
    (SHIFT_ORDER.indexOf(a.id) + 99) - (SHIFT_ORDER.indexOf(b.id) + 99)
  );

  // cargo
  const byRole = {};
  stores.forEach((st) => {
    st.people.forEach((p) => {
      const k = p.role;
      const label = ROLE_SHORT[k] || p.roleLabel || k;
      if (!byRole[k]) byRole[k] = { id: k, label, pago: 0, receb: 0, total: 0 };
      byRole[k].pago  += p.valorPago;
      byRole[k].total += 1;
      if (p.valorPago > 0) byRole[k].receb += 1;
    });
  });
  const roles = Object.values(byRole).sort((a, b) =>
    ROLE_ORDER_FMGR.indexOf(a.id) - ROLE_ORDER_FMGR.indexOf(b.id)
  );

  const maxShiftPago = Math.max(1, ...shifts.map((s) => s.pago));
  const maxRolePago  = Math.max(1, ...roles.map((r) => r.pago));

  return (
    <div className="fmgr-breakdown">
      <BreakdownCard
        title="Quebra por turno"
        subtitle="Total pago e nº de pessoas que receberam em cada turno"
        rows={shifts}
        maxPago={maxShiftPago}
        accent="navy"
      />
      <BreakdownCard
        title="Quebra por cargo"
        subtitle="Total pago e nº de pessoas que receberam em cada cargo"
        rows={roles}
        maxPago={maxRolePago}
        accent="green"
      />
    </div>
  );
}

function BreakdownCard({ title, subtitle, rows, maxPago, accent }) {
  const total = rows.reduce((s, r) => s + r.pago, 0);
  const totalReceb = rows.reduce((s, r) => s + r.receb, 0);
  const totalElig  = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="fmgr-breakdown-card">
      <div className="fmgr-breakdown-card-head">
        <div>
          <h3 className="fmgr-breakdown-card-title">{title}</h3>
          <p className="fmgr-breakdown-card-sub">{subtitle}</p>
        </div>
        <div className="fmgr-breakdown-card-total">
          <span className="fmgr-breakdown-card-total-label">Total</span>
          <span className="fmgr-breakdown-card-total-value">R$ {fmtMoneyFMgr(total)}</span>
          <span className="fmgr-breakdown-card-total-meta">
            <strong>{fmtIntFMgr(totalReceb)}</strong> de <strong>{fmtIntFMgr(totalElig)}</strong> receberam
          </span>
        </div>
      </div>

      <div className="fmgr-breakdown-rows">
        {rows.map((row) => {
          const pct = (row.pago / maxPago) * 100;
          const recebPct = row.total ? (row.receb / row.total) * 100 : 0;
          const zero = row.pago === 0;
          return (
            <div key={row.id} className={`fmgr-breakdown-row ${zero ? 'fmgr-breakdown-row--zero' : ''}`}>
              <div className="fmgr-breakdown-row-head">
                <span className="fmgr-breakdown-row-label">{row.label}</span>
                <span className="fmgr-breakdown-row-value">R$ {fmtMoneyFMgr(row.pago)}</span>
              </div>
              <div className={`fmgr-breakdown-bar fmgr-breakdown-bar--${accent}`}>
                <div className="fmgr-breakdown-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="fmgr-breakdown-row-meta">
                <strong>{fmtIntFMgr(row.receb)}</strong> de <strong>{fmtIntFMgr(row.total)}</strong> receberam · <strong>{fmtPctFMgr(recebPct)}</strong> dos elegíveis
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── week navigator ───────────────────────────────────────────────────────────
function MgrWeekNav({ weeks, weekId, onChange }) {
  const idx = weeks.findIndex((w) => w.id === weekId);
  const prev = idx >= 0 && idx < weeks.length - 1 ? weeks[idx + 1] : null;
  const next = idx > 0 ? weeks[idx - 1] : null;
  const current = weeks[idx];
  if (!current) return null;

  return (
    <div className="fmgr-weeknav">
      <button
        className="fmgr-weeknav-btn"
        disabled={!prev}
        onClick={() => prev && onChange(prev.id)}
        title={prev ? `Ir para ${prev.label}` : 'Sem semana anterior'}
      >
        <Icon name="chevron_left" size={14} />
        <span className="fmgr-weeknav-btn-text">{prev ? prev.label : 'Anterior'}</span>
      </button>

      <div className="fmgr-weeknav-current">
        <div className="fmgr-weeknav-eyebrow">Semana selecionada</div>
        <div className="fmgr-weeknav-title">
          <select
            className="fmgr-weeknav-select"
            value={weekId}
            onChange={(e) => onChange(e.target.value)}
          >
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label} · {w.rangeLabel}
              </option>
            ))}
          </select>
        </div>
        <div className="fmgr-weeknav-range">{current.rangeLabel}</div>
      </div>

      <button
        className="fmgr-weeknav-btn"
        disabled={!next}
        onClick={() => next && onChange(next.id)}
        title={next ? `Ir para ${next.label}` : 'Sem semana mais recente'}
      >
        <span className="fmgr-weeknav-btn-text">{next ? next.label : 'Próxima'}</span>
        <Icon name="chevron_right" size={14} />
      </button>
    </div>
  );
}

// ── store card ───────────────────────────────────────────────────────────────
function MgrStoreCard({ store, onOpen }) {
  const sepTone = slaToneFMgr(store.slaSep);
  const comTone = slaToneFMgr(store.slaCom);
  const blocked = store.gateLojaBlocked;
  const paidPct = store.elegiveis ? (store.receberam / store.elegiveis) * 100 : 0;

  return (
    <button
      type="button"
      className={`fmgr-store-card ${blocked ? 'fmgr-store-card--blocked' : ''} ${store.totalPago > 0 ? 'fmgr-store-card--paying' : ''}`}
      onClick={() => onOpen(store.storeId)}
    >
      <div className="fmgr-store-card-head">
        <div>
          <div className="fmgr-store-card-name">{store.storeName}</div>
          <div className="fmgr-store-card-sub">
            {fmtIntFMgr(store.elegiveis)} pessoa{store.elegiveis !== 1 ? 's' : ''} elegív{store.elegiveis !== 1 ? 'eis' : 'el'}
          </div>
        </div>
        {blocked ? (
          <span className="fmgr-gate-pill fmgr-gate-pill--bad">
            <Icon name="alert" size={11} /> Gate loja
          </span>
        ) : store.totalPago > 0 ? (
          <span className="fmgr-gate-pill fmgr-gate-pill--ok">
            <Icon name="check" size={11} /> Liberada
          </span>
        ) : (
          <span className="fmgr-gate-pill fmgr-gate-pill--neutral">
            Zerada
          </span>
        )}
      </div>

      <div className="fmgr-store-card-payout">
        <span className="fmgr-store-card-payout-currency">R$</span>
        <span className="fmgr-store-card-payout-value">{fmtMoneyFMgr(store.totalPago)}</span>
      </div>

      <div className="fmgr-store-card-people">
        <span className="fmgr-store-card-people-num">
          <strong>{fmtIntFMgr(store.receberam)}</strong> de {fmtIntFMgr(store.elegiveis)} receberam
        </span>
        <div className="fmgr-store-card-bar">
          <div
            className="fmgr-store-card-bar-fill"
            style={{ width: `${paidPct}%` }}
          />
        </div>
      </div>

      <div className="fmgr-store-card-metrics">
        <div className="fmgr-store-card-metric">
          <span className="fmgr-store-card-metric-label">SLA separação</span>
          <span className={`fmgr-store-card-metric-value ${sepTone}`}>{fmtPctFMgr(store.slaSep)}</span>
        </div>
        <div className="fmgr-store-card-metric">
          <span className="fmgr-store-card-metric-label">SLA completos</span>
          <span className={`fmgr-store-card-metric-value ${comTone}`}>{fmtPctFMgr(store.slaCom)}</span>
        </div>
        <div className="fmgr-store-card-metric">
          <span className="fmgr-store-card-metric-label">Descontos</span>
          <span className={`fmgr-store-card-metric-value ${store.totalDescontos > 0 ? 'warn' : ''}`}>
            R$ {fmtMoneyFMgr(store.totalDescontos)}
          </span>
        </div>
      </div>

      {blocked && store.gateLojaReason && (
        <div className="fmgr-store-card-blocked-foot">
          <Icon name="alert_circle" size={12} /> Motivo: {store.gateLojaReason}
        </div>
      )}

      <div className="fmgr-store-card-cta">
        Ver pessoas <Icon name="arrow_right" size={12} />
      </div>
    </button>
  );
}

// ── store detail (drill-down) ────────────────────────────────────────────────
function MgrStoreDetail({ store, week, viewerRole, onBack, onOpenPersonFeedback }) {
  // sort: paid desc, then by role hierarchy, then by name
  const ROLE_ORDER = { supervisor: 0, team_leader: 1, operador: 2 };
  const sorted = [...store.people].sort((a, b) => {
    if (b.valorPago !== a.valorPago) return b.valorPago - a.valorPago;
    const ra = ROLE_ORDER[a.role] ?? 9;
    const rb = ROLE_ORDER[b.role] ?? 9;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name, 'pt-BR');
  });

  const blocked = store.gateLojaBlocked;

  // shift breakdown
  const byShift = {};
  store.people.forEach((p) => {
    const k = p.shiftId || '—';
    if (!byShift[k]) byShift[k] = { id: k, label: p.shiftLabel || '—', pago: 0, receb: 0, total: 0 };
    byShift[k].pago  += p.valorPago;
    byShift[k].total += 1;
    if (p.valorPago > 0) byShift[k].receb += 1;
  });
  const shifts = Object.values(byShift).sort((a, b) => b.pago - a.pago);

  return (
    <div className="fmgr-detail">
      <button className="backlink" onClick={onBack}>
        <Icon name="arrow_left" size={14} /> Voltar para a visão de lojas
      </button>

      <div className="fmgr-detail-head">
        <div>
          <span className="page-eyebrow">Detalhe da loja · {week.label}</span>
          <h1 className="page-title">{store.storeName}</h1>
          <p className="page-subtitle">
            {fmtIntFMgr(store.receberam)} de {fmtIntFMgr(store.elegiveis)} receberam bônus · período {week.rangeLabel}
          </p>
        </div>
        {blocked ? (
          <span className="fmgr-gate-pill fmgr-gate-pill--bad fmgr-gate-pill--lg">
            <Icon name="alert" size={13} /> Loja bloqueada · {store.gateLojaReason}
          </span>
        ) : (
          <span className="fmgr-gate-pill fmgr-gate-pill--ok fmgr-gate-pill--lg">
            <Icon name="check" size={13} /> Loja liberada
          </span>
        )}
      </div>

      <div className="fmgr-detail-summary">
        <div className="fmgr-detail-summary-block">
          <span className="fmgr-kpi-label">Total pago</span>
          <span className="fmgr-detail-summary-value">R$ {fmtMoneyFMgr(store.totalPago)}</span>
        </div>
        <div className="fmgr-detail-summary-block">
          <span className="fmgr-kpi-label">SLA separação</span>
          <span className={`fmgr-detail-summary-value ${slaToneFMgr(store.slaSep)}`}>{fmtPctFMgr(store.slaSep)}</span>
        </div>
        <div className="fmgr-detail-summary-block">
          <span className="fmgr-kpi-label">SLA completos</span>
          <span className={`fmgr-detail-summary-value ${slaToneFMgr(store.slaCom)}`}>{fmtPctFMgr(store.slaCom)}</span>
        </div>
        <div className="fmgr-detail-summary-block">
          <span className="fmgr-kpi-label">Descontos totais</span>
          <span className={`fmgr-detail-summary-value ${store.totalDescontos > 0 ? 'warn' : ''}`}>
            R$ {fmtMoneyFMgr(store.totalDescontos)}
          </span>
        </div>
      </div>

      {shifts.length > 1 && (
        <div className="fmgr-detail-shifts">
          <div className="fmgr-detail-section-title">Quebra por turno</div>
          <div className="fmgr-detail-shifts-grid">
            {shifts.map((sh) => (
              <div key={sh.id} className="fmgr-detail-shift-card">
                <span className="fmgr-detail-shift-label">{sh.label}</span>
                <span className="fmgr-detail-shift-value">R$ {fmtMoneyFMgr(sh.pago)}</span>
                <span className="fmgr-detail-shift-meta">{sh.receb} de {sh.total} receberam</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="fmgr-detail-section-title">Pessoas elegíveis</div>
      <div className="fmgr-people-table-wrap">
        <table className="fmgr-people-table">
          <thead>
            <tr>
              <th>Pessoa</th>
              <th>Cargo</th>
              <th>Turno</th>
              <th className="num">Valor pago</th>
              <th className="num">Descontos</th>
              <th>Status / motivo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const reason = p.valorPago === 0 ? personReasonFMgr(p) : null;
              return (
                <tr key={p.personId} className={p.valorPago === 0 ? 'fmgr-row--zero' : ''}>
                  <td>
                    <div className="fmgr-person-name">{p.name}</div>
                  </td>
                  <td>{p.roleLabel}</td>
                  <td>{p.shiftLabel || '—'}</td>
                  <td className="num fmgr-num-money">
                    {p.valorPago > 0
                      ? <span className="fmgr-paid">R$ {fmtMoneyFMgr(p.valorPago)}</span>
                      : <span className="fmgr-zero">R$ 0,00</span>}
                    {p.maxPossivel > 0 && (
                      <span className="fmgr-num-max">de R$ {fmtMoneyFMgr(p.maxPossivel)}</span>
                    )}
                  </td>
                  <td className="num">
                    {p.descontos > 0
                      ? <span className="fmgr-disc">−R$ {fmtMoneyFMgr(p.descontos)}</span>
                      : <span className="fmgr-disc-zero">—</span>}
                  </td>
                  <td>
                    {p.valorPago > 0 ? (
                      <span className="fmgr-status-tag fmgr-status-tag--ok">Recebeu</span>
                    ) : reason ? (
                      <span className={`fmgr-status-tag fmgr-status-tag--${reason.kind}`}>
                        {reason.tag} · {reason.label}
                      </span>
                    ) : (
                      <span className="fmgr-status-tag fmgr-status-tag--neutral">Zerado</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="fmgr-detail-link"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onOpenPersonFeedback(p.personId, week.id);
                      }}
                      title="Abrir feedback individual completo"
                    >
                      Feedback completo <Icon name="arrow_right" size={11} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── main view ────────────────────────────────────────────────────────────────
export default function FeedbackManagerView({
  viewerRole,
  feedbackIndex,
  weekBundles,
  onWeekLoad,
  onOpenPersonFeedback,
  onBack,
  user,
  onLogout,
}) {
  const FU = FeedbackUtils;

  const weeks = useMemoFMgr(
    () => FU.buildWeeksFromIndex(feedbackIndex || []),
    [feedbackIndex]
  );

  const [weekId, setWeekId] = useStateFMgr(() => (weeks[0] ? weeks[0].id : ''));
  const [drillStoreId, setDrillStoreId] = useStateFMgr(null);

  useEffectFMgr(() => {
    if (!weekId && weeks[0]) setWeekId(weeks[0].id);
  }, [weeks, weekId]);

  // Lazy load bundle when week changes
  useEffectFMgr(() => {
    if (!weekId) return;
    if (weekBundles && weekBundles[weekId]) return;
    onWeekLoad && onWeekLoad(weekId);
  }, [weekId, weekBundles]);

  // Reset drill-down when week changes
  useEffectFMgr(() => { setDrillStoreId(null); }, [weekId]);

  const bundle = weekBundles && weekBundles[weekId];
  const stores = useMemoFMgr(
    () => bundle ? aggregateStoresFMgr(bundle.snapshots || []) : [],
    [bundle]
  );

  // Sort stores: paying ↓, then blocked at the bottom, then by total paid desc
  const storesSorted = useMemoFMgr(() => {
    return [...stores].sort((a, b) => {
      if (a.gateLojaBlocked !== b.gateLojaBlocked) return a.gateLojaBlocked ? 1 : -1;
      return b.totalPago - a.totalPago;
    });
  }, [stores]);

  const currentWeek = weeks.find((w) => w.id === weekId);
  const drillStore = stores.find((s) => s.storeId === drillStoreId);

  const topBar = (
    <div className="top-bar">
      <img src="/shopper-icon.avif" alt="Shopper" className="top-bar-logo-img" />
      <div className="top-bar-divider" />
      <div className="top-bar-context">
        <span className="top-bar-eyebrow">Feedbacks</span>
        <span className="top-bar-store">Bonificação Semanal</span>
      </div>
      <div className="top-bar-spacer" />
      <button className="top-bar-logout" onClick={onBack} title="Voltar ao menu" style={{ marginRight: 8 }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span className="top-bar-logout-text">Menu</span>
      </button>
      {user && (
        <div className="top-bar-user">
          {user.picture && <img src={user.picture} alt={user.name} className="top-bar-avatar" referrerPolicy="no-referrer" />}
          <span className="top-bar-username">{user?.name?.split(' ')[0]}</span>
          {onLogout && (
            <button className="top-bar-logout" onClick={onLogout} title="Sair">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="top-bar-logout-text">Sair</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (weeks.length === 0) {
    return (
      <div>
        {topBar}
        <div className="page">
          {onBack && (
            <button className="backlink" onClick={onBack}>
              <Icon name="arrow_left" size={14} /> Voltar para o menu
            </button>
          )}
          <div style={{ padding: '2rem', color: 'var(--fg-3)' }}>
            Sem semanas de feedback publicadas. Aguarde o próximo fechamento.
          </div>
        </div>
      </div>
    );
  }

  // ── DRILL-DOWN: store detail ──
  if (drillStore && currentWeek) {
    return (
      <div>
        {topBar}
        <div className="page">
          <MgrStoreDetail
            store={drillStore}
            week={currentWeek}
            viewerRole={viewerRole}
            onBack={() => setDrillStoreId(null)}
            onOpenPersonFeedback={onOpenPersonFeedback}
          />
        </div>
      </div>
    );
  }

  // ── OVERVIEW ──
  return (
    <div>
      {topBar}
      <div className="page">
      {onBack && (
        <button className="backlink" onClick={onBack}>
          <Icon name="arrow_left" size={14} /> Voltar para o menu
        </button>
      )}

      <div className="page-header">
        <div className="page-title-wrap">
          <span className="page-eyebrow">Bonificação semanal · Visão gerencial</span>
          <h1 className="page-title">Pagamentos da semana</h1>
          <p className="page-subtitle">
            {currentWeek
              ? <>Resumo de todas as lojas processadas no período {currentWeek.rangeLabel}.</>
              : 'Selecione uma semana para ver os pagamentos.'}
          </p>
        </div>
      </div>

      <MgrWeekNav weeks={weeks} weekId={weekId} onChange={setWeekId} />

      {!bundle && (
        <div className="loading-state" style={{ margin: '24px 0' }}>
          Carregando dados da semana…
        </div>
      )}

      {bundle && stores.length === 0 && (
        <div className="loading-state" style={{ margin: '24px 0' }}>
          Sem dados de pessoas para esta semana.
        </div>
      )}

      {bundle && stores.length > 0 && (
        <>
          <MgrKpiStrip stores={stores} />

          <MgrBreakdownSection stores={stores} />

          <div className="fmgr-section-header">
            <div>
              <h2 className="fmgr-section-title">Lojas processadas ({stores.length})</h2>
              <p className="fmgr-section-sub">
                Toque em uma loja para ver as pessoas e os motivos · ordenadas por valor pago (bloqueadas no fim)
              </p>
            </div>
            <div className="fmgr-section-legend">
              <span className="fmgr-legend-item"><span className="fmgr-legend-dot ok" /> Liberada</span>
              <span className="fmgr-legend-item"><span className="fmgr-legend-dot bad" /> Bloqueada por gate</span>
              <span className="fmgr-legend-item"><span className="fmgr-legend-dot neutral" /> Zerada (sem ninguém recebendo)</span>
            </div>
          </div>

          <div className="fmgr-store-grid">
            {storesSorted.map((st) => (
              <MgrStoreCard key={st.storeId} store={st} onOpen={setDrillStoreId} />
            ))}
          </div>
        </>
      )}
      </div>
    </div>
  );
};

