import React, {
  useMemo as useMemoFeedback,
  useState as useStateFeedback,
  useEffect as useEffectFeedback,
  useCallback as useCallbackFeedback,
} from 'react'
import Icon from '../components/Icon'
import * as FeedbackUtils from './FeedbackData'
import './feedback.css'

const fmtMoneyFeedback = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPctFeedback = (value) => (value == null ? '—' : `${Number(value).toFixed(1)}%`);

const rateBadge = (value) => {
  if (value == null) return '';
  if (value >= 98) return 'positive';
  if (value >= 95) return 'warning';
  return 'negative';
};

function FilterBar({ viewerRole, value, onChange, options, onDeleteWeek }) {
  const canPickStore  = viewerRole === 'admin';
  const canPickShift  = viewerRole === 'admin' || viewerRole === 'supervisor';
  const canPickRole   = viewerRole === 'admin' || viewerRole === 'supervisor';
  const canPickPerson = viewerRole !== 'operador';
  const isAdmin       = viewerRole === 'admin';

  const visiblePeople = useMemoFeedback(() => {
    return options.people.filter((person) => {
      if (value.storeId && person.storeId !== value.storeId) return false;
      if (value.shiftId && person.shiftId && person.shiftId !== value.shiftId) return false;
      if (value.roleScope !== 'all' && person.role !== value.roleScope) return false;
      return true;
    });
  }, [options.people, value.storeId, value.shiftId, value.roleScope]);

  useEffectFeedback(() => {
    if (!canPickPerson) return;
    if (visiblePeople.some((person) => person.id === value.personId)) return;
    if (visiblePeople[0]) onChange({ ...value, personId: visiblePeople[0].id });
  }, [canPickPerson, onChange, value, visiblePeople]);

  const patch = (changes) => onChange({ ...value, ...changes });

  return (
    <div className="fb-filter-bar">
      <div className="fb-filter">
        <span className="fb-filter-label">Semana</span>
        <div className="fb-filter-week-row">
          <select
            className="fb-filter-select"
            value={value.weekId}
            onChange={(event) => patch({ weekId: event.target.value })}
          >
            {options.weeks.map((week) => (
              <option key={week.id} value={week.id}>
                {week.label} · {week.rangeLabel}
              </option>
            ))}
          </select>
          {isAdmin && value.weekId && (
            <button
              className="fb-delete-week-btn"
              title="Excluir semana do KV (irreversível)"
              onClick={() => onDeleteWeek && onDeleteWeek(value.weekId)}
            >
              <Icon name="trash" size={13} />
            </button>
          )}
        </div>
      </div>

      {canPickStore && (
        <div className="fb-filter">
          <span className="fb-filter-label">Loja</span>
          <select
            className="fb-filter-select"
            value={value.storeId || ''}
            onChange={(event) => patch({ storeId: event.target.value || null })}
          >
            <option value="">Todas</option>
            {options.stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {canPickRole && (
        <div className="fb-filter">
          <span className="fb-filter-label">Cargo</span>
          <select
            className="fb-filter-select"
            value={value.roleScope}
            onChange={(event) => patch({ roleScope: event.target.value })}
          >
            <option value="all">Todos</option>
            <option value="operador">Operador</option>
            <option value="team_leader">Team leader</option>
            <option value="supervisor">Supervisor</option>
          </select>
        </div>
      )}

      {canPickShift && (
        <div className="fb-filter">
          <span className="fb-filter-label">Turno</span>
          <select
            className="fb-filter-select"
            value={value.shiftId || ''}
            onChange={(event) => patch({ shiftId: event.target.value || null })}
          >
            <option value="">Todos</option>
            {options.shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {canPickPerson && (
        <div className="fb-filter">
          <span className="fb-filter-label">Pessoa</span>
          <select
            className="fb-filter-select"
            value={value.personId}
            onChange={(event) => patch({ personId: event.target.value })}
          >
            {visiblePeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} · {person.roleLabel}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function Identification({ report }) {
  return (
    <div className="fb-ident">
      <div>
        <div className="fb-ident-eyebrow">Feedback semanal de bonificação</div>
        <h2 className="fb-ident-name">{report.person.name}</h2>
        <div className="fb-ident-meta">
          <span className="fb-ident-role">{report.person.roleLabel}</span>
          <span className="fb-ident-sep">·</span>
          <span className="fb-ident-store">{report.store.name}</span>
          {report.shift && report.shift.name && (
            <>
              <span className="fb-ident-sep">·</span>
              <span className="fb-ident-shift">{report.shift.name}</span>
              {report.shift.window && (
                <span className="fb-ident-shift-window">{report.shift.window}</span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="fb-ident-week">
        <span className="fb-ident-week-label">Período</span>
        <span className="fb-ident-week-num">Semana {report.week.number} · {report.week.year}</span>
        <span className="fb-ident-week-range">
          {report.fmtFull(report.week.start)} a {report.fmtFull(report.week.end)}
        </span>
        <span className="fb-ident-update">
          Atualizado em {report.ultimaAtualizacao.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

function FormulaBand({ title, expression, applied }) {
  return (
    <div className="fbv2-formula-stack">
      <div className="fbv2-formula-band">
        <span className="fbv2-formula-title">{title}</span>
        <span className="fbv2-formula-text">{expression}</span>
      </div>
      {applied && (
        <div className="fbv2-formula-band applied">
          <span className="fbv2-formula-title">Com os números da semana</span>
          <span className="fbv2-formula-text">{applied}</span>
        </div>
      )}
    </div>
  );
}

function MetricValue({ primary, secondary, tone, centered = false }) {
  return (
    <div className={`fbv2-metric-stack ${tone || ''} ${centered ? 'centered' : ''}`}>
      <span className="fbv2-metric-primary">{primary}</span>
      {secondary && <span className="fbv2-metric-secondary">{secondary}</span>}
    </div>
  );
}

function PrerequisitesSection({ report }) {
  const detractors = [
    report.assiduidade.falta       && 'Falta',
    report.assiduidade.atestado    && 'Atestado',
    report.assiduidade.advertencia && 'Advertência',
    report.assiduidade.suspensao   && 'Suspensão',
  ].filter(Boolean);

  const storeFailure = report.gates.store.some((item) => !item.passed);
  const supervisorReportIssue = report.gates.personal.find(
    (item) => item.label === 'Relatório do supervisor' && item.status !== 'ok',
  );
  const operatorBlock = report.gates.component.find((item) => item.status === 'failed_component_zero');
  const hasFailures = storeFailure || detractors.length > 0 || !!supervisorReportIssue || !!operatorBlock;

  const [open, setOpen] = useStateFeedback(hasFailures);
  useEffectFeedback(() => {
    setOpen(hasFailures);
  }, [report.person.id, report.week.id, hasFailures]);

  return (
    <section className="fbv2-section">
      <details className="fbv2-disclosure" open={open}>
        <summary
          className="fbv2-disclosure-summary fbv2-prereq-summary"
          onClick={(event) => {
            event.preventDefault();
            setOpen((current) => !current);
          }}
        >
          <div>
            <h3 className="fb-simple-section-title">Pré-requisitos</h3>
            <p className="fb-simple-section-desc">
              {hasFailures
                ? 'Há itens com impacto no fechamento da semana.'
                : 'Todos os pré-requisitos foram atendidos nesta semana.'}
            </p>
          </div>
          <span className={`fbv2-badge ${hasFailures ? 'bad' : 'ok'}`}>
            {hasFailures ? 'Há falhas' : 'Tudo atendido'}
          </span>
        </summary>

        <div className="fbv2-gates-grid">
          <div className="fbv2-card">
            <div className="fbv2-card-head">
              <h4 className="fbv2-card-title">Pré-requisitos da loja</h4>
              <span className={`fbv2-inline-status ${storeFailure ? 'bad' : 'ok'}`}>
                {storeFailure ? 'Algum item falhou e zera a loja' : 'Loja aprovada nos mínimos'}
              </span>
            </div>
            <div className="fbv2-gate-list">
              {report.gates.store.map((item) => (
                <div key={item.key} className={`fbv2-gate-row ${item.passed ? 'ok' : 'bad'}`}>
                  <div>
                    <div className="fbv2-gate-label">{item.label}</div>
                    <div className="fbv2-gate-meta">{item.threshold}</div>
                  </div>
                  <div className="fbv2-gate-value-wrap">
                    <span className={`fbv2-badge ${item.passed ? 'ok' : 'bad'}`}>{item.passed ? 'Atendido' : 'Falha'}</span>
                    <span className="fbv2-gate-value">{item.display}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="fbv2-card">
            <div className="fbv2-card-head">
              <h4 className="fbv2-card-title">Pré-requisitos individuais</h4>
              <span className={`fbv2-inline-status ${detractors.length || supervisorReportIssue || operatorBlock ? 'bad' : 'ok'}`}>
                {detractors.length || supervisorReportIssue || operatorBlock ? 'Há impacto individual' : 'Sem bloqueios individuais'}
              </span>
            </div>

            <div className="fbv2-gate-list">
              <div className={`fbv2-gate-row ${detractors.length ? 'bad' : 'ok'}`}>
                <div>
                  <div className="fbv2-gate-label">Detratores</div>
                  <div className="fbv2-gate-meta">
                    {detractors.length ? `Registrado: ${detractors.join(' · ')}` : 'Sem falta, atestado, advertência ou suspensão na semana.'}
                  </div>
                </div>
                <span className={`fbv2-badge ${detractors.length ? 'bad' : 'ok'}`}>
                  {detractors.length ? 'Falha' : 'Atendido'}
                </span>
              </div>

              {report.person.role === 'supervisor' && (
                <div className={`fbv2-gate-row ${supervisorReportIssue ? 'bad' : 'ok'}`}>
                  <div>
                    <div className="fbv2-gate-label">Relatório do supervisor</div>
                    <div className="fbv2-gate-meta">
                      {supervisorReportIssue ? 'Relatório não enviado no prazo.' : 'Relatório enviado no prazo da semana.'}
                    </div>
                  </div>
                  <span className={`fbv2-badge ${supervisorReportIssue ? 'bad' : 'ok'}`}>
                    {supervisorReportIssue ? 'Falha' : 'Atendido'}
                  </span>
                </div>
              )}

              {report.person.role === 'operador' && report.gates.component.length > 0 && (
                <div className={`fbv2-gate-row ${operatorBlock ? 'warn' : 'ok'}`}>
                  <div>
                    <div className="fbv2-gate-label">Participação mínima no abastecimento</div>
                    <div className="fbv2-gate-meta">
                      Participação da semana: {fmtPctFeedback(report.abastecimento.participacaoPct)} · mínimo de 8%.
                    </div>
                  </div>
                  <span className={`fbv2-badge ${operatorBlock ? 'warn' : 'ok'}`}>
                    {operatorBlock ? 'Bloqueia o abastecimento' : 'Atendido'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </details>
    </section>
  );
}

function SummaryCards({ report, activeCard, onToggle }) {
  const finance = report.financeiro;
  const splitAbast   = report.splits?.abast ?? report.splits?.abastecimento ?? 0;
  const splitPedidos = report.splits?.pedidos ?? 0;

  const cards = [
    {
      key: 'maximo',
      label: 'Valor máximo possível',
      value: finance.tetoSemanal,
      valueClass: '',
      note: report.person.role === 'supervisor'
        ? <>Abastecimento <strong>50%</strong> (<strong>R$ {fmtMoneyFeedback(finance.parcelaMaximaAbastecimento)}</strong>) · Pedidos <strong>50%</strong> (<strong>R$ {fmtMoneyFeedback(finance.parcelaMaximaPedidos)}</strong>)</>
        : <>Abastecimento com peso de <strong>{(splitAbast * 100).toFixed(0)}%</strong> (<strong>R$ {fmtMoneyFeedback(finance.parcelaMaximaAbastecimento)}</strong>) · Pedidos com peso de <strong>{(splitPedidos * 100).toFixed(0)}%</strong> (<strong>R$ {fmtMoneyFeedback(finance.parcelaMaximaPedidos)}</strong>)</>,
      subnote: report.person.role === 'supervisor'
        ? <>Pedidos usam <strong>70%</strong> separação da loja e <strong>30%</strong> completos · abastecimento usa <strong>100%</strong> da loja</>
        : report.person.role === 'team_leader'
        ? <>Pedidos usam <strong>70%</strong> separação da loja e <strong>30%</strong> completos · abastecimento usa <strong>60%</strong> turno e <strong>40%</strong> loja</>
        : <>Pedidos usam <strong>70%</strong> separação da loja e <strong>30%</strong> completos · abastecimento usa <strong>70%</strong> individual e <strong>30%</strong> turno</>,
      cta: 'Ver cálculo', dark: false,
    },
    {
      key: 'pedidos',
      label: 'Ganho com pedidos',
      value: finance.valorPagoPedidos,
      prefix: '+R$', valueClass: 'win',
      note: <>
        <strong>{report.mainRateScopeLabel}:</strong> <strong>{fmtPctFeedback(report.pedidos.principalRate)}</strong><br />
        <strong>Separação da loja:</strong> <strong>{fmtPctFeedback(report.pedidos.storeSeparation)}</strong><br />
        <strong>Completos da loja:</strong> <strong>{fmtPctFeedback(report.pedidos.storeCompletes)}</strong>
      </>,
      subnote: <>Esse valor já considera <strong>descontos</strong>, <strong>pré-requisitos</strong> e o <strong>limite final</strong> do componente.</>,
      cta: 'Ver cálculo', dark: false,
    },
    {
      key: 'abastecimento',
      label: 'Ganho com abastecimento',
      value: finance.valorPagoAbastecimento,
      prefix: '+R$', valueClass: 'win',
      note: <>
        <strong>Nota final:</strong> <strong>{fmtPctFeedback(report.abastecimento.notaFinal)}</strong><br />
        <strong>Parcela máxima:</strong> <strong>R$ {fmtMoneyFeedback(finance.parcelaMaximaAbastecimento)}</strong>
      </>,
      subnote: <>O percentual liberado e a faixa de pagamento aparecem no <strong>passo a passo do cálculo</strong>.</>,
      cta: 'Ver cálculo', dark: false,
    },
    {
      key: 'descontos',
      label: 'Perdido em descontos',
      value: finance.totalDescontos,
      prefix: '−R$', valueClass: 'lose',
      note: <><strong>{report.descontos.errosNormais.qtd}</strong> erro(s) normal · <strong>{report.descontos.errosGraves.qtd}</strong> erro(s) grave</>,
      subnote: <>Entram apenas eventos penalizados para <strong>{report.scopePenaltyLabel}</strong></>,
      cta: 'Ver cálculo', dark: false,
    },
    {
      key: 'final',
      label: 'Total efetivamente pago',
      value: finance.bonusFinal,
      prefix: 'R$', valueClass: '',
      note: <>Pedidos <strong>R$ {fmtMoneyFeedback(finance.valorPagoPedidos)}</strong> + Abastecimento <strong>R$ {fmtMoneyFeedback(finance.valorPagoAbastecimento)}</strong></>,
      subnote: finance.valorPagoAbastecimento === 0
        ? <>Nesta semana o total pago ficou igual ao ganho com pedidos porque o componente de abastecimento fechou em <strong>R$ 0,00</strong>.</>
        : <>Teto semanal de <strong>R$ {fmtMoneyFeedback(finance.tetoSemanal)}</strong>.</>,
      cta: 'Ver cálculo', dark: true,
    },
  ];

  return (
    <section className="fbv2-section">
      <div className="fb-hero-grid fb-hero-grid-five">
        {cards.map((card) => (
          <button
            key={card.key}
            className={`fb-hero-card ${card.dark ? 'primary' : ''} ${activeCard === card.key ? 'active' : ''}`}
            onClick={() => onToggle(card.key)}
          >
            <span className="fb-hero-label">{card.label}</span>
            <span className={`fb-hero-value ${card.valueClass || ''}`}>
              {card.prefix && <span className="fb-hero-currency">{card.prefix}</span>}
              {!card.prefix && <span className="fb-hero-currency">R$</span>}
              {fmtMoneyFeedback(card.value)}
            </span>
            <span className="fb-hero-rule">{card.note}</span>
            {card.subnote ? <span className="fbv2-card-subnote">{card.subnote}</span> : <span className="fbv2-card-subnote empty" />}
            <span className="fb-hero-link">{card.cta} <Icon name={activeCard === card.key ? 'chevron_down' : 'chevron_right'} size={12} /></span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MaxPossiblePanel({ report }) {
  const finance = report.financeiro;
  return (
    <>
      <FormulaBand
        title="Estrutura base"
        expression="Valor máximo possível = parcela máxima de pedidos + parcela máxima de abastecimento"
        applied={`R$ ${fmtMoneyFeedback(finance.parcelaMaximaPedidos)} + R$ ${fmtMoneyFeedback(finance.parcelaMaximaAbastecimento)} = R$ ${fmtMoneyFeedback(finance.tetoSemanal)}`}
      />
      <div className="fbv2-memory">
        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">Parcela máxima de pedidos</div>
            <div className="fbv2-memory-rule">Parte do teto semanal reservada para pedidos neste cargo e turno.</div>
          </div>
          <div className="fbv2-memory-value">R$ {fmtMoneyFeedback(finance.parcelaMaximaPedidos)}</div>
        </div>
        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">Parcela máxima de abastecimento</div>
            <div className="fbv2-memory-rule">Parte do teto semanal reservada para abastecimento neste cargo e turno.</div>
          </div>
          <div className="fbv2-memory-value">R$ {fmtMoneyFeedback(finance.parcelaMaximaAbastecimento)}</div>
        </div>
        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">Como pedidos é formado</div>
            <div className="fbv2-memory-rule">Sempre usa 70% separação da loja e 30% completos da loja para formar o fator final.</div>
          </div>
          <div className="fbv2-memory-value">70% / 30%</div>
        </div>
        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">Como abastecimento é formado</div>
            <div className="fbv2-memory-rule">
              {report.person.role === 'supervisor'
                ? 'Supervisor usa 100% da nota da loja.'
                : report.person.role === 'team_leader'
                ? 'Team leader usa 60% turno e 40% loja.'
                : 'Operador usa 70% individual e 30% turno.'}
            </div>
          </div>
          <div className="fbv2-memory-value">
            {report.person.role === 'supervisor' ? '100% loja' : report.person.role === 'team_leader' ? '60% / 40%' : '70% / 30%'}
          </div>
        </div>
      </div>
    </>
  );
}

function PedidosPanel({ report }) {
  const finance = report.financeiro;
  const pedidos = report.pedidos;
  const descontos = report.descontos;
  const formulaApplied = `R$ ${fmtMoneyFeedback(pedidos.base)} × (0,7 × ${pedidos.multSeparacao.toFixed(1)} + 0,3 × ${pedidos.multCompletos.toFixed(1)}) − (R$ ${fmtMoneyFeedback(descontos.rupturas.total)} + R$ ${fmtMoneyFeedback(descontos.errosNormais.total)} + R$ ${fmtMoneyFeedback(descontos.errosGraves.total)}) = R$ ${fmtMoneyFeedback(finance.resultadoFinalPedidos)}`;

  return (
    <>
      <FormulaBand
        title="Fórmula base"
        expression="Resultado de pedidos = faixa base × (0,7 × multiplicador da separação da loja + 0,3 × multiplicador dos completos da loja) − descontos"
        applied={formulaApplied}
      />

      <div className="fbv2-memory">
        <div className="fbv2-memory-row spotlight">
          <div>
            <div className="fbv2-memory-label">Base usada para a taxa</div>
            <div className="fbv2-memory-rule">{report.mainRateScopeLabel}</div>
          </div>
          <MetricValue primary={`${report.mainRateScopeLabel} = ${fmtPctFeedback(pedidos.principalRate)}`} secondary={report.person.roleLabel} centered tone={pedidos.principalRate >= 95 ? 'positive' : 'negative'} />
        </div>

        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">Valor obtido</div>
            <div className="fbv2-memory-rule">Valor obtido pela taxa principal antes dos multiplicadores da loja e dos descontos.</div>
          </div>
          <MetricValue primary={`R$ ${fmtMoneyFeedback(pedidos.base)}`} secondary={pedidos.base === 0 ? 'Abaixo de 95%' : pedidos.base <= 150 ? 'Faixa intermediária ou máxima' : 'Faixa máxima'} />
        </div>

        <div className="fbv2-memory-row spotlight">
          <div>
            <div className="fbv2-memory-label">Taxa de separação da loja</div>
            <div className="fbv2-memory-rule">Esse valor determina o multiplicador de separação da loja.</div>
          </div>
          <MetricValue primary={`Taxa de separação da loja = ${fmtPctFeedback(pedidos.storeSeparation)}`} secondary={`corresponde a ${pedidos.multSeparacao.toFixed(1)}x`} centered tone={rateBadge(pedidos.storeSeparation)} />
        </div>

        <div className="fbv2-memory-row spotlight">
          <div>
            <div className="fbv2-memory-label">Taxa de completos da loja</div>
            <div className="fbv2-memory-rule">Esse valor determina o multiplicador dos completos da loja.</div>
          </div>
          <MetricValue primary={`Taxa de completos da loja = ${fmtPctFeedback(pedidos.storeCompletes)}`} secondary={`corresponde a ${pedidos.multCompletos.toFixed(1)}x`} centered tone={rateBadge(pedidos.storeCompletes)} />
        </div>

        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">Fator final da loja</div>
            <div className="fbv2-memory-rule">0,7 × separação + 0,3 × completos</div>
          </div>
          <MetricValue primary={`${pedidos.fatorLoja.toFixed(2)}x`} secondary={`0,7 × ${pedidos.multSeparacao.toFixed(1)} + 0,3 × ${pedidos.multCompletos.toFixed(1)}`} />
        </div>

        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">Valor bruto de pedidos</div>
            <div className="fbv2-memory-rule">Faixa base multiplicada pelo fator final da loja.</div>
          </div>
          <MetricValue primary={`R$ ${fmtMoneyFeedback(pedidos.valorBruto)}`} tone="positive" />
        </div>

        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">Rupturas consideradas</div>
            <div className="fbv2-memory-rule">Entram apenas rupturas penalizadas para {report.scopePenaltyLabel}.</div>
          </div>
          <MetricValue primary={`${descontos.rupturas.qtd}`} secondary={`− R$ ${fmtMoneyFeedback(descontos.rupturas.total)}`} tone={descontos.rupturas.qtd > 0 ? 'negative' : ''} />
        </div>

        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">Erros normais considerados</div>
            <div className="fbv2-memory-rule">Entram apenas erros penalizados para {report.scopePenaltyLabel}.</div>
          </div>
          <MetricValue primary={`${descontos.errosNormais.qtd}`} secondary={`− R$ ${fmtMoneyFeedback(descontos.errosNormais.total)}`} tone={descontos.errosNormais.qtd > 0 ? 'negative' : ''} />
        </div>

        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">Erros graves considerados</div>
            <div className="fbv2-memory-rule">Entram apenas erros graves penalizados para {report.scopePenaltyLabel}.</div>
          </div>
          <MetricValue primary={`${descontos.errosGraves.qtd}`} secondary={`− R$ ${fmtMoneyFeedback(descontos.errosGraves.total)}`} tone={descontos.errosGraves.qtd > 0 ? 'negative' : ''} />
        </div>

        <div className="fbv2-memory-row total">
          <div>
            <div className="fbv2-memory-label">Resultado final de pedidos</div>
            <div className="fbv2-memory-rule">Depois de descontos, pré-requisitos e zeragens da semana.</div>
          </div>
          <MetricValue primary={`R$ ${fmtMoneyFeedback(finance.resultadoFinalPedidos)}`} />
        </div>

        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">Parcela máxima de pedidos</div>
            <div className="fbv2-memory-rule">Limite deste componente dentro do teto semanal.</div>
          </div>
          <MetricValue primary={`R$ ${fmtMoneyFeedback(finance.parcelaMaximaPedidos)}`} />
        </div>

        <div className="fbv2-memory-row total">
          <div>
            <div className="fbv2-memory-label">Ganho com pedidos</div>
            <div className="fbv2-memory-rule">Menor entre o resultado final de pedidos e a parcela máxima de pedidos.</div>
          </div>
          <MetricValue primary={`R$ ${fmtMoneyFeedback(finance.valorPagoPedidos)}`} tone="positive" />
        </div>
      </div>
    </>
  );
}

function AbastecimentoPanel({ report }) {
  const finance = report.financeiro;
  const abast = report.abastecimento;
  const formulaApplied = report.person.role === 'supervisor'
    ? `Nota final = nota da loja (${fmtPctFeedback(abast.mediaLoja)}) · faixa ${abast.faixaPagamento} · ${(abast.percLiberado * 100).toFixed(0)}% × R$ ${fmtMoneyFeedback(finance.parcelaMaximaAbastecimento)} = R$ ${fmtMoneyFeedback(finance.valorPagoAbastecimento)}`
    : report.person.role === 'team_leader'
    ? `Nota final = 0,6 × ${fmtPctFeedback(abast.mediaTurno)} + 0,4 × ${fmtPctFeedback(abast.mediaLoja)} = ${fmtPctFeedback(abast.notaFinal)} · ${(abast.percLiberado * 100).toFixed(0)}% × R$ ${fmtMoneyFeedback(finance.parcelaMaximaAbastecimento)} = R$ ${fmtMoneyFeedback(finance.valorPagoAbastecimento)}`
    : `Nota final = 0,7 × ${fmtPctFeedback(abast.mediaPessoa)} + 0,3 × ${fmtPctFeedback(abast.mediaTurno)} = ${fmtPctFeedback(abast.notaFinal)} · ${(abast.percLiberado * 100).toFixed(0)}% × R$ ${fmtMoneyFeedback(finance.parcelaMaximaAbastecimento)} = R$ ${fmtMoneyFeedback(finance.valorPagoAbastecimento)}`;

  return (
    <>
      <FormulaBand
        title="Fórmula base"
        expression="Nota diária = 0,8 × nota de velocidade + 0,2 × nota de término · valor pago = percentual da faixa × parcela máxima de abastecimento"
        applied={formulaApplied}
      />

      <div className="fbv2-memory">
        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">UAB da pessoa na semana</div>
            <div className="fbv2-memory-rule">UAB = itens + 2 × SKUs</div>
          </div>
          <MetricValue primary={`${abast.uabPessoaSemana.toLocaleString('pt-BR')} UAB`} />
        </div>

        {abast.participacaoPct != null && (
          <div className="fbv2-memory-row">
            <div>
              <div className="fbv2-memory-label">Participação no turno</div>
              <div className="fbv2-memory-rule">Operador precisa atingir pelo menos 8% do volume do turno.</div>
            </div>
            <MetricValue primary={fmtPctFeedback(abast.participacaoPct)} secondary={abast.participacaoPct < 8 ? 'Abaixo do mínimo' : 'Dentro do mínimo'} tone={abast.participacaoPct < 8 ? 'negative' : 'positive'} />
          </div>
        )}

        {abast.mediaPessoa != null && (
          <div className="fbv2-memory-row">
            <div>
              <div className="fbv2-memory-label">Média semanal individual</div>
              <div className="fbv2-memory-rule">Média das notas diárias da pessoa.</div>
            </div>
            <MetricValue primary={fmtPctFeedback(abast.mediaPessoa)} tone={rateBadge(abast.mediaPessoa)} />
          </div>
        )}

        {report.person.role !== 'supervisor' && (
          <div className="fbv2-memory-row spotlight">
            <div>
              <div className="fbv2-memory-label">Média semanal do turno</div>
              <div className="fbv2-memory-rule">Média das notas diárias do turno.</div>
            </div>
            <MetricValue primary={`Média semanal do turno = ${fmtPctFeedback(abast.mediaTurno)}`} secondary="resultado da semana" centered tone={rateBadge(abast.mediaTurno)} />
          </div>
        )}

        <div className="fbv2-memory-row spotlight">
          <div>
            <div className="fbv2-memory-label">Média semanal da loja</div>
            <div className="fbv2-memory-rule">Média das notas diárias da loja.</div>
          </div>
          <MetricValue primary={`Média semanal da loja = ${fmtPctFeedback(abast.mediaLoja)}`} secondary="resultado da semana" centered tone={rateBadge(abast.mediaLoja)} />
        </div>

        <div className="fbv2-memory-row spotlight">
          <div>
            <div className="fbv2-memory-label">Composição da nota final</div>
            <div className="fbv2-memory-rule">
              {report.person.role === 'supervisor'
                ? 'Supervisor usa 100% da loja.'
                : report.person.role === 'team_leader'
                ? 'Team leader usa 60% turno e 40% loja.'
                : 'Operador usa 70% individual e 30% turno.'}
            </div>
          </div>
          <MetricValue primary={`Nota final = ${fmtPctFeedback(abast.notaFinal)}`} secondary={report.person.role === 'supervisor' ? '100% loja' : report.person.role === 'team_leader' ? '60% turno + 40% loja' : '70% individual + 30% turno'} centered tone={rateBadge(abast.notaFinal)} />
        </div>

        <div className="fbv2-memory-row spotlight">
          <div>
            <div className="fbv2-memory-label">Faixa de pagamento</div>
            <div className="fbv2-memory-rule">A nota final libera um percentual da parcela máxima de abastecimento.</div>
          </div>
          <MetricValue primary={`Faixa de pagamento = ${abast.faixaPagamento}`} secondary={`corresponde a ${(abast.percLiberado * 100).toFixed(0)}% da parcela máxima`} centered />
        </div>

        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">Parcela máxima de abastecimento</div>
            <div className="fbv2-memory-rule">Limite deste componente dentro do teto semanal.</div>
          </div>
          <MetricValue primary={`R$ ${fmtMoneyFeedback(finance.parcelaMaximaAbastecimento)}`} />
        </div>

        <div className="fbv2-memory-row total">
          <div>
            <div className="fbv2-memory-label">Ganho com abastecimento</div>
            <div className="fbv2-memory-rule">
              {report.gates.abastecimentoZero
                ? 'O pré-requisito de participação bloqueou este componente nesta semana.'
                : 'Percentual da faixa aplicado sobre a parcela máxima de abastecimento.'}
            </div>
          </div>
          <MetricValue primary={`R$ ${fmtMoneyFeedback(finance.valorPagoAbastecimento)}`} tone="positive" />
        </div>
      </div>

      <div className="fbv2-day-table-wrap">
        <table className="fb-audit-tbl">
          <thead>
            <tr>
              <th>Data</th>
              <th>Turno</th>
              <th>Itens</th>
              <th>SKUs</th>
              <th>UAB</th>
              <th>Minutos</th>
              <th>Velocidade</th>
              <th>Nota de velocidade</th>
              <th>Término</th>
              <th>Nota de término</th>
              <th>Nota do dia</th>
            </tr>
          </thead>
          <tbody>
            {(!report.diasAbastecimento || report.diasAbastecimento.length === 0) ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--fg-3)', padding: '16px' }}>
                Sem detalhamento diário de abastecimento nesta semana.
              </td></tr>
            ) : report.diasAbastecimento.map((day, index) => (
              <tr key={index}>
                <td>{report.fmtDay(day.date)}</td>
                <td style={{ color: 'var(--fg-2)', whiteSpace: 'nowrap' }}>{day.turno || '—'}</td>
                <td className="num">{day.itens}</td>
                <td className="num">{day.skus}</td>
                <td className="num">{day.uab}</td>
                <td className="num">{day.minutos}</td>
                <td className="num">{day.velocidade.toFixed(2)} UAB/min</td>
                <td className="num">{day.notaVelocidade}</td>
                <td>{day.horaFim}</td>
                <td className="num">{day.notaTermino}</td>
                <td className="num">{day.notaDia.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DiscountsPanel({ report }) {
  const descontos = report.descontos;
  return (
    <>
      <FormulaBand
        title="Fórmula base"
        expression="Total em descontos = rupturas penalizadas + erros normais penalizados + erros graves penalizados"
        applied={`R$ ${fmtMoneyFeedback(descontos.rupturas.total)} + R$ ${fmtMoneyFeedback(descontos.errosNormais.total)} + R$ ${fmtMoneyFeedback(descontos.errosGraves.total)} = R$ ${fmtMoneyFeedback(descontos.totalGeral)}`}
      />
      <div className="fbv2-memory">
        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">Rupturas penalizadas</div>
            <div className="fbv2-memory-rule">Itens com ruptura que entraram na conta desta pessoa.</div>
          </div>
          <MetricValue primary={`${descontos.rupturas.qtd}`} secondary={`− R$ ${fmtMoneyFeedback(descontos.rupturas.total)}`} tone={descontos.rupturas.qtd > 0 ? 'negative' : ''} />
        </div>
        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">Erros normais penalizados</div>
            <div className="fbv2-memory-rule">Ocorrências normais consideradas nesta conta.</div>
          </div>
          <MetricValue primary={`${descontos.errosNormais.qtd}`} secondary={`− R$ ${fmtMoneyFeedback(descontos.errosNormais.total)}`} tone={descontos.errosNormais.qtd > 0 ? 'negative' : ''} />
        </div>
        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">Erros graves penalizados</div>
            <div className="fbv2-memory-rule">Ocorrências graves consideradas nesta conta.</div>
          </div>
          <MetricValue primary={`${descontos.errosGraves.qtd}`} secondary={`− R$ ${fmtMoneyFeedback(descontos.errosGraves.total)}`} tone={descontos.errosGraves.qtd > 0 ? 'negative' : ''} />
        </div>
        <div className="fbv2-memory-row total">
          <div>
            <div className="fbv2-memory-label">Perdido em descontos</div>
            <div className="fbv2-memory-rule">Soma das penalizações da semana.</div>
          </div>
          <MetricValue primary={`R$ ${fmtMoneyFeedback(descontos.totalGeral)}`} tone="negative" />
        </div>
      </div>
    </>
  );
}

function FinalPanel({ report }) {
  const finance = report.financeiro;
  return (
    <>
      <FormulaBand
        title="Fórmula final"
        expression="Total efetivamente pago = ganho com pedidos + ganho com abastecimento"
        applied={`R$ ${fmtMoneyFeedback(finance.valorPagoPedidos)} + R$ ${fmtMoneyFeedback(finance.valorPagoAbastecimento)} = R$ ${fmtMoneyFeedback(finance.bonusFinal)}`}
      />
      <div className="fbv2-memory">
        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">Ganho com pedidos</div>
            <div className="fbv2-memory-rule">Valor pago no componente de pedidos depois dos pré-requisitos e do limite do componente.</div>
          </div>
          <MetricValue primary={`R$ ${fmtMoneyFeedback(finance.valorPagoPedidos)}`} tone="positive" />
        </div>
        <div className="fbv2-memory-row">
          <div>
            <div className="fbv2-memory-label">Ganho com abastecimento</div>
            <div className="fbv2-memory-rule">Valor pago no componente de abastecimento depois da nota final e dos pré-requisitos.</div>
          </div>
          <MetricValue primary={`R$ ${fmtMoneyFeedback(finance.valorPagoAbastecimento)}`} tone="positive" />
        </div>
        <div className="fbv2-memory-row total">
          <div>
            <div className="fbv2-memory-label">Total efetivamente pago</div>
            <div className="fbv2-memory-rule">Soma final dos dois componentes da semana.</div>
          </div>
          <MetricValue primary={`R$ ${fmtMoneyFeedback(finance.bonusFinal)}`} tone="positive" />
        </div>
      </div>
    </>
  );
}

function ActiveCalcPanel({ report, activeCard, onClose }) {
  if (!activeCard) return null;

  const titleMap = {
    maximo:         'Cálculo do valor máximo possível',
    pedidos:        'Passo a passo do cálculo · pedidos',
    abastecimento:  'Passo a passo do cálculo · abastecimento',
    descontos:      'Passo a passo do cálculo · descontos',
    final:          'Passo a passo do cálculo · total efetivamente pago',
  };

  let content = null;
  if (activeCard === 'maximo')        content = <MaxPossiblePanel report={report} />;
  if (activeCard === 'pedidos')       content = <PedidosPanel report={report} />;
  if (activeCard === 'abastecimento') content = <AbastecimentoPanel report={report} />;
  if (activeCard === 'descontos')     content = <DiscountsPanel report={report} />;
  if (activeCard === 'final')         content = <FinalPanel report={report} />;

  return (
    <div className="fb-active-panel">
      <div className="fb-active-panel-head">
        <h3 className="fb-active-panel-title">{titleMap[activeCard]}</h3>
        <button className="fb-active-panel-close" onClick={onClose}>Fechar</button>
      </div>
      {content}
    </div>
  );
}

function ErrorsTable({ report }) {
  const count = report.errors ? report.errors.length : 0;
  const penalizedNormal = report.descontos ? report.descontos.errosNormais.qtd : 0;
  const penalizedGrave  = report.descontos ? report.descontos.errosGraves.qtd  : 0;
  const penalized = penalizedNormal + penalizedGrave;
  return (
    <section className="fbv2-section">
      <div className="fb-simple-section-head">
        <h3 className="fb-simple-section-title">Erros registrados</h3>
        <p className="fb-simple-section-desc">
          {count > 0 ? <><strong>{count} ocorrência{count !== 1 ? 's' : ''}</strong> registrada{count !== 1 ? 's' : ''} · </> : null}
          <strong>{penalized}</strong> com impacto no cálculo desta pessoa.
          {count > 0 && <span style={{ color: 'var(--fg-3)', marginLeft: 4 }}>As colunas Considerar e Grave indicam a classificação de cada item.</span>}
        </p>
      </div>
      <div className="fb-detail fb-table-scroll">
        <table className="fb-audit-tbl">
          <thead className="fb-thead-sticky">
            <tr>
              <th>Data</th><th style={{ textAlign: 'right' }}>Hora</th><th>Responsável</th><th style={{ textAlign: 'right' }}>Pedido</th>
              <th>Considerar</th><th>Grave</th><th>Responsabilidade</th><th>Erro</th><th>Link</th>
            </tr>
          </thead>
          <tbody>
            {count === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--fg-3)', padding: '16px' }}>Nenhum erro registrado nesta semana.</td></tr>
            ) : report.errors.map((error, index) => (
              <tr key={index}>
                <td>{report.fmtDay(error.date)}</td>
                <td className="num">{error.hour}</td>
                <td>{error.responsavel}</td>
                <td className="num">{error.pedido}</td>
                <td>{error.considerado}</td>
                <td>{error.grave}</td>
                <td>{error.responsabilidade}</td>
                <td>{error.erro}</td>
                <td>{error.link && error.link !== '—'
                  ? <a href={error.link} target="_blank" rel="noreferrer">Ver evidência</a>
                  : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RupturesTable({ report }) {
  const count = report.ruptures ? report.ruptures.length : 0;
  const penalized = report.descontos ? report.descontos.rupturas.qtd : 0;
  return (
    <section className="fbv2-section">
      <div className="fb-simple-section-head">
        <h3 className="fb-simple-section-title">Rupturas da loja no período</h3>
        <p className="fb-simple-section-desc">
          {count > 0 ? <><strong>{count} evento{count !== 1 ? 's' : ''}</strong> na loja · </> : null}
          <strong>{penalized}</strong> com impacto no cálculo desta pessoa.
          {count > penalized && penalized > 0 && (
            <span style={{ color: 'var(--fg-3)', marginLeft: 4 }}>A diferença inclui eventos resolvidos ou fora do escopo penalizado.</span>
          )}
          {penalized > count && (
            <span style={{ marginLeft: 4, color: 'var(--warning, #b45309)' }}>O cálculo usa escopo {report.scopePenaltyLabel} — a lista pode não cobrir todos os eventos.</span>
          )}
        </p>
      </div>
      <div className="fb-detail fb-table-scroll">
        <table className="fb-audit-tbl">
          <thead className="fb-thead-sticky">
            <tr>
              <th>Data</th><th style={{ textAlign: 'right' }}>Hora</th><th style={{ textAlign: 'right' }}>Pedido</th><th>Produto</th>
            </tr>
          </thead>
          <tbody>
            {count === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--fg-3)', padding: '16px' }}>Nenhuma ruptura registrada para a loja nesta semana.</td></tr>
            ) : report.ruptures.map((item, index) => (
              <tr key={index}>
                <td>{report.fmtDay(item.date)}</td>
                <td className="num">{item.hour}</td>
                <td className="num">{item.pedido}</td>
                <td>{item.produto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── FeedbackPage ──────────────────────────────────────────────────────────────
// Props:
//   viewerRole   — 'admin' | 'supervisor' | 'team_leader' | 'operador'
//   feedbackIndex — array from GET /api/feedback-weekly (no week_id)
//   weekBundles  — { [weekId]: bundle } map, populated lazily per week
//   onWeekLoad   — fn(weekId) called when a bundle needs to be loaded
//   onBack       — optional back handler

export default function FeedbackPage({
  viewerRole,
  feedbackIndex,
  weekBundles,
  onWeekLoad,
  onDeleteWeek,
  initialSelection,
  onBack,
}) {
  const Utils = FeedbackUtils;

  // Build WEEKS list from index
  const WEEKS = useMemoFeedback(() => {
    return Utils.buildWeeksFromIndex(feedbackIndex || []);
  }, [feedbackIndex]);

  // Build PEOPLE list from all loaded bundles (updated when a new bundle arrives)
  const PEOPLE = useMemoFeedback(() => {
    return Utils.buildPeopleFromBundles(weekBundles || {});
  }, [weekBundles]);

  // Build unique stores and shifts from PEOPLE
  const stores = useMemoFeedback(() => {
    const map = {};
    PEOPLE.forEach((p) => { if (!map[p.storeId]) map[p.storeId] = { id: p.storeId, name: p.storeId }; });
    return Object.values(map);
  }, [PEOPLE]);

  const shifts = useMemoFeedback(() => {
    const map = {};
    PEOPLE.forEach((p) => { if (p.shiftId && !map[p.shiftId]) map[p.shiftId] = { id: p.shiftId, name: p.shiftId }; });
    return Object.values(map);
  }, [PEOPLE]);

  // Initial filter state
  const initialState = useMemoFeedback(() => {
    const firstWeek   = WEEKS[0];
    const firstPerson = PEOPLE[0];
    // If parent passed a deep-link (personId + weekId) prefer it.
    if (initialSelection && initialSelection.personId && initialSelection.weekId) {
      const presetPerson = PEOPLE.find((p) => p.id === initialSelection.personId);
      return {
        weekId:    initialSelection.weekId,
        personId:  initialSelection.personId,
        storeId:   viewerRole === 'admin' ? (presetPerson ? presetPerson.storeId : null) : (presetPerson ? presetPerson.storeId : null),
        shiftId:   viewerRole === 'team_leader' ? (presetPerson ? presetPerson.shiftId : null) : null,
        roleScope: 'all',
      };
    }
    return {
      weekId:    firstWeek   ? firstWeek.id   : '',
      personId:  firstPerson ? firstPerson.id : '',
      storeId:   viewerRole === 'admin' ? null : (firstPerson ? firstPerson.storeId : null),
      shiftId:   viewerRole === 'team_leader' ? (firstPerson ? firstPerson.shiftId : null) : null,
      roleScope: 'all',
    };
  }, [WEEKS, PEOPLE, viewerRole, initialSelection]);

  const [selected, setSelected] = useStateFeedback(initialState);
  const [activeCard, setActiveCard] = useStateFeedback(null);

  useEffectFeedback(() => setSelected(initialState), [initialState]);

  // Lazy-load bundle when week changes
  const onWeekLoadRef = React.useRef(onWeekLoad);
  useEffectFeedback(() => { onWeekLoadRef.current = onWeekLoad; }, [onWeekLoad]);

  useEffectFeedback(() => {
    if (!selected.weekId) return;
    if (weekBundles && weekBundles[selected.weekId]) return;
    onWeekLoadRef.current && onWeekLoadRef.current(selected.weekId);
  }, [selected.weekId, weekBundles]);

  useEffectFeedback(() => { setActiveCard(null); }, [selected.personId, selected.weekId]);

  // Resolve report for current selection
  const report = useMemoFeedback(() => {
    if (!selected.personId || !selected.weekId) return null;
    if (!weekBundles || !weekBundles[selected.weekId]) return null;
    const bundle = weekBundles[selected.weekId];
    const snap = (bundle.snapshots || []).find((s) => s.identity.person_id === selected.personId);
    if (!snap) return null;
    return Utils.snapshotToReport(snap);
  }, [selected.personId, selected.weekId, weekBundles]);

  if (WEEKS.length === 0) {
    return (
      <div className="page">
        <p style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
          Sem semanas de feedback disponíveis. Aguarde a próxima publicação ou verifique as permissões.
        </p>
      </div>
    );
  }

  const bundleLoaded = weekBundles && weekBundles[selected.weekId];

  return (
    <div className="page">
      {onBack && (
        <button className="backlink" onClick={onBack}>
          <Icon name="arrow_left" size={14} /> {initialSelection ? 'Voltar para a visão gerencial' : 'Voltar para o painel'}
        </button>
      )}

      <FilterBar
        viewerRole={viewerRole}
        value={selected}
        onChange={setSelected}
        options={{ weeks: WEEKS, people: PEOPLE, stores, shifts }}
        onDeleteWeek={onDeleteWeek}
      />

      {!bundleLoaded && (
        <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
          Carregando dados da semana…
        </div>
      )}

      {bundleLoaded && !report && (
        <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
          Sem dados para a seleção atual.
        </div>
      )}

      {bundleLoaded && report && (
        <>
          <Identification report={report} />
          <PrerequisitesSection report={report} />
          <SummaryCards
            report={report}
            activeCard={activeCard}
            onToggle={(card) => setActiveCard((c) => (c === card ? null : card))}
          />
          <ActiveCalcPanel report={report} activeCard={activeCard} onClose={() => setActiveCard(null)} />
          <ErrorsTable report={report} />
          <RupturesTable report={report} />
        </>
      )}
    </div>
  );
};

