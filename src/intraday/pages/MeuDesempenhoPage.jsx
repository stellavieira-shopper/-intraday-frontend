import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// ─── formatação ───────────────────────────────────────────────────────────────

const TURNO_LABEL = { MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite' }

function fmtTurno(turno) {
  if (!turno) return '—'
  return TURNO_LABEL[turno.toUpperCase()] ?? capitalize(turno.toLowerCase())
}

function fmtCargo(cargo) {
  if (!cargo) return '—'
  const up = cargo.toUpperCase().trim()
  if (up === 'SUPERVISOR') return 'Supervisor'
  if (up.includes('TEAM') || up.includes('LIDER') || up === 'TL') return 'Team Líder'
  if (up.includes('PICKING')) return 'Op. de Picking'
  if (up === 'OPERADOR') return 'Operador'
  return capitalize(cargo.toLowerCase())
}

function capitalize(str) {
  return str ? str.replace(/\b\w/g, c => c.toUpperCase()) : str
}

function fmtLoja(code) {
  if (!code) return '—'
  return capitalize(code.replace(/-/g, ' '))
}

function initials(nome) {
  return nome.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('')
}

function getEscopoTipo(cargo) {
  const up = (cargo || '').toUpperCase().trim()
  if (up === 'SUPERVISOR') return 'loja'
  if (up.includes('TEAM') || up.includes('LIDER') || up === 'TL') return 'turno'
  return null
}

// ─── datas ────────────────────────────────────────────────────────────────────

function hoje() {
  return new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    .split('/').reverse().join('-')
}

function isoWeekBounds(offset = 0) {
  const now = new Date()
  const day = (now.getDay() + 6) % 7
  const mon = new Date(now); mon.setDate(now.getDate() - day + offset * 7)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const fmt = d => d.toISOString().split('T')[0]
  return { inicio: fmt(mon), fim: fmt(sun) }
}

const PERIODOS = [
  { id: 'hoje',        label: 'Hoje' },
  { id: 'ontem',      label: 'Ontem' },
  { id: 'semana',     label: 'Esta semana' },
  { id: 'semana_ant', label: 'Semana passada' },
]

function resolverPeriodo(id) {
  const h = hoje()
  const ontem = new Date(); ontem.setDate(ontem.getDate() - 1)
  const ontemStr = ontem.toISOString().split('T')[0]
  if (id === 'hoje')       return { inicio: h, fim: h }
  if (id === 'ontem')      return { inicio: ontemStr, fim: ontemStr }
  if (id === 'semana')     return isoWeekBounds(0)
  if (id === 'semana_ant') return isoWeekBounds(-1)
  return { inicio: h, fim: h }
}

function fmtData(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ─── sub-componentes ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, size = 'normal' }) {
  const isSmall = size === 'small'
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
      padding: isSmall ? '12px 16px' : '18px 22px',
      flex: '1 1 140px', minWidth: isSmall ? 110 : 130,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: isSmall ? 20 : 26, fontWeight: 800, color: color || 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function SectionLabel({ children, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>{children}</div>
      {badge && (
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'var(--shopper-red)', color: '#fff' }}>{badge}</span>
      )}
    </div>
  )
}

function BarraSLA({ comSla, semSla }) {
  const total = (comSla || 0) + (semSla || 0)
  if (!total) return null
  const pctSla = Math.round((comSla / total) * 100)
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10 }}>Composição dos pedidos</div>
      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2, marginBottom: 10 }}>
        <div style={{ width: `${pctSla}%`, background: 'var(--shopper-red)', borderRadius: '5px 0 0 5px', transition: 'width 0.4s' }} />
        <div style={{ flex: 1, background: 'var(--border)', borderRadius: '0 5px 5px 0' }} />
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12 }}><strong>{comSla}</strong> com SLA ({pctSla}%)</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}><strong>{semSla}</strong> sem SLA</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>Total: {total}</span>
      </div>
    </div>
  )
}

function TabelaPedidos({ pedidos, showErro }) {
  const SLA_COR   = { DENTRO_SLA: 'var(--green)', FORA_SLA: 'var(--red)' }
  const SLA_LABEL = { DENTRO_SLA: 'Dentro', FORA_SLA: 'Fora' }
  const headers = ['Data', 'Pedido', 'SLA', 'Ruptura', ...(showErro ? ['Erro'] : []), 'Foto', 'Ciclo (min)', 'Turno']
  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            {headers.map(h => (
              <th key={h} style={{ padding: '9px 13px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pedidos.map((p, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'var(--surface)' }}>
              <td style={{ padding: '8px 13px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{fmtData(p.data_ref)}</td>
              <td style={{ padding: '8px 13px', fontFamily: 'monospace', fontSize: 12 }}>{p.cod_pedido}</td>
              <td style={{ padding: '8px 13px' }}>
                {p.status_sla
                  ? <span style={{ fontWeight: 700, color: SLA_COR[p.status_sla] || 'var(--text-muted)' }}>{SLA_LABEL[p.status_sla] || p.status_sla}</span>
                  : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
              </td>
              <td style={{ padding: '8px 13px' }}>
                {p.teve_ruptura === 'SIM'
                  ? <span style={{ color: 'var(--red)', fontWeight: 700 }}>Sim</span>
                  : <span style={{ color: 'var(--green)' }}>Não</span>}
              </td>
              {showErro && (
                <td style={{ padding: '8px 13px' }}>
                  {p.tipo_erro === 'grave'
                    ? <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: 11 }}>Grave</span>
                    : p.tipo_erro === 'normal'
                      ? <span style={{ color: 'var(--yellow)', fontWeight: 700, fontSize: 11 }}>Erro</span>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                </td>
              )}
              <td style={{ padding: '8px 13px' }}>
                {p.foto === 'Sim' ? <span style={{ color: 'var(--green)' }}>✓</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </td>
              <td style={{ padding: '8px 13px', fontVariantNumeric: 'tabular-nums' }}>{p.cycle_min ?? '—'}</td>
              <td style={{ padding: '8px 13px', color: 'var(--text-muted)' }}>{fmtTurno(p.turno)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── filtro pill ──────────────────────────────────────────────────────────────

function FiltroGroup({ label, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '4px 12px', borderRadius: 14, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: value === opt.value ? 'none' : '1px solid var(--border)',
            background: value === opt.value ? 'var(--shopper-red)' : 'var(--surface)',
            color: value === opt.value ? '#fff' : 'var(--text-muted)',
          }}
        >{opt.label}</button>
      ))}
    </div>
  )
}

// ─── picker de colaboradores ──────────────────────────────────────────────────

function PickerColaboradores({ onSelecionar }) {
  const [lista, setLista]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [busca, setBusca]       = useState('')
  const [filtroLoja, setFiltroLoja]   = useState('todas')
  const [filtroTurno, setFiltroTurno] = useState('todos')

  useEffect(() => {
    axios.get(`${API}/api/intraday/colaboradores`)
      .then(r => setLista(r.data.colaboradores || []))
      .catch(() => setLista([]))
      .finally(() => setLoading(false))
  }, [])

  const lojas = [...new Set(lista.map(c => c.store_code).filter(Boolean))].sort()
  const turnos = [...new Set(lista.map(c => c.turno).filter(Boolean))].sort()

  const filtrados = lista.filter(c => {
    const matchBusca = !busca ||
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.store_code || '').toLowerCase().includes(busca.toLowerCase())
    const matchLoja  = filtroLoja === 'todas' || c.store_code === filtroLoja
    const matchTurno = filtroTurno === 'todos' || c.turno === filtroTurno
    return matchBusca && matchLoja && matchTurno
  })

  const porLoja = filtrados.reduce((acc, c) => {
    const loja = c.store_code || 'outros'
    if (!acc[loja]) acc[loja] = []
    acc[loja].push(c)
    return acc
  }, {})

  const lojasFiltradas = Object.keys(porLoja).sort()
  const umaLoja = lojas.length === 1

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Busca */}
      <input
        type="text"
        placeholder="Buscar colaborador..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        style={{
          width: '100%', padding: '10px 16px', fontSize: 14, borderRadius: 8,
          border: '1px solid var(--border)', background: '#fff', outline: 'none',
          boxSizing: 'border-box', marginBottom: 14,
        }}
      />

      {/* Filtros */}
      {(lojas.length > 1 || turnos.length > 1) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, padding: '14px 16px', background: '#fff', border: '1px solid var(--border)', borderRadius: 10 }}>
          {lojas.length > 1 && (
            <FiltroGroup
              label="Loja"
              value={filtroLoja}
              onChange={setFiltroLoja}
              options={[{ value: 'todas', label: 'Todas' }, ...lojas.map(l => ({ value: l, label: fmtLoja(l) }))]}
            />
          )}
          {turnos.length > 1 && (
            <FiltroGroup
              label="Turno"
              value={filtroTurno}
              onChange={setFiltroTurno}
              options={[{ value: 'todos', label: 'Todos' }, ...turnos.map(t => ({ value: t, label: fmtTurno(t) }))]}
            />
          )}
        </div>
      )}

      {loading && <div className="loading-state"><div className="spinner" /><span>Carregando...</span></div>}
      {!loading && filtrados.length === 0 && <div className="empty-state empty-state--full">Nenhum colaborador encontrado.</div>}

      {!loading && lojasFiltradas.map(loja => (
        <div key={loja} style={{ marginBottom: 22 }}>
          {!umaLoja && (
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
              {fmtLoja(loja)} <span style={{ fontWeight: 400 }}>({porLoja[loja].length})</span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {porLoja[loja].map(c => (
              <button
                key={c.nome}
                onClick={() => onSelecionar(c)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px',
                  borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)',
                  background: '#fff', textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--shopper-red)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {initials(c.nome)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{capitalize(c.nome.toLowerCase())}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    {fmtCargo(c.cargo)} · {fmtTurno(c.turno)}
                    {!umaLoja ? ` · ${fmtLoja(c.store_code)}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ver →</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── desempenho individual ────────────────────────────────────────────────────

function KpiGroup({ stats, size, label, badge }) {
  if (!stats) return null
  const slaColor = stats.taxa_sla >= 85 ? 'var(--green)' : stats.taxa_sla >= 70 ? 'var(--yellow)' : 'var(--red)'
  return (
    <>
      <SectionLabel badge={badge}>{label}</SectionLabel>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        <KpiCard size={size} label="SLA" value={stats.taxa_sla != null ? `${stats.taxa_sla}%` : '—'} sub={`${stats.dentro_sla} dentro · ${stats.fora_sla} fora`} color={stats.taxa_sla != null ? slaColor : undefined} />
        <KpiCard size={size} label="Pedidos c/ SLA" value={stats.pedidos_com_sla ?? 0} sub="contam para bônus" />
        <KpiCard size={size} label="Pedidos s/ SLA" value={stats.pedidos_sem_sla ?? 0} sub="não contam" />
        <KpiCard size={size} label="Rupturas" value={stats.pedidos_com_ruptura ?? 0} sub={`de ${stats.total_pedidos} pedidos`} color={stats.pedidos_com_ruptura > 0 ? 'var(--yellow)' : undefined} />
        <KpiCard size={size} label="Ciclo médio" value={stats.avg_cycle_min != null ? `${stats.avg_cycle_min}min` : '—'} />
      </div>
    </>
  )
}

function DesempenhoIndividual({ colaborador, onVoltar }) {
  const [periodo, setPeriodo] = useState('semana')
  const [loading, setLoading] = useState(false)
  const [dados, setDados]     = useState(null)
  const [erro, setErro]       = useState(null)

  const { inicio, fim } = resolverPeriodo(periodo)
  const escopoTipo = getEscopoTipo(colaborador.cargo)

  const buscar = useCallback(async () => {
    setLoading(true); setErro(null)
    try {
      const params = {
        nome: colaborador.nome,
        data_inicio: inicio,
        data_fim: fim,
      }
      if (escopoTipo) {
        params.escopo = escopoTipo
        params.store_code = colaborador.store_code
        if (escopoTipo === 'turno') params.turno = colaborador.turno
      }
      const { data } = await axios.get(`${API}/api/intraday/minha-performance`, { params })
      setDados(data)
    } catch (e) {
      setErro(e.response?.data?.erro || e.message)
    } finally {
      setLoading(false)
    }
  }, [colaborador.nome, colaborador.store_code, colaborador.turno, escopoTipo, inicio, fim])

  useEffect(() => { buscar() }, [buscar])

  const escopoBadge = escopoTipo === 'loja'
    ? `Loja: ${fmtLoja(colaborador.store_code)}`
    : escopoTipo === 'turno'
      ? `Turno: ${fmtTurno(colaborador.turno)}`
      : null

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <button onClick={onVoltar} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}>← Voltar</button>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--shopper-red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
          {initials(colaborador.nome)}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{capitalize(colaborador.nome.toLowerCase())}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {fmtCargo(colaborador.cargo)} · {fmtTurno(colaborador.turno)} · {fmtLoja(colaborador.store_code)}
          </div>
        </div>
      </div>

      {/* Período */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {PERIODOS.map(p => (
          <button key={p.id} onClick={() => setPeriodo(p.id)} style={{
            padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: periodo === p.id ? 'none' : '1px solid var(--border)',
            background: periodo === p.id ? 'var(--shopper-red)' : 'var(--surface)',
            color: periodo === p.id ? '#fff' : 'var(--text-muted)',
          }}>{p.label}</button>
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>
          {fmtData(inicio)}{inicio !== fim ? ` – ${fmtData(fim)}` : ''}
        </span>
      </div>

      {(periodo === 'hoje' || periodo === 'ontem') && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>⏳</span>
          <span style={{ fontSize: 12, color: '#92400E', lineHeight: 1.55 }}>
            <strong>Dados em atualização:</strong> os erros operacionais podem aumentar ao longo do dia à medida que os registros são processados. Os números ficam consolidados apenas no fechamento da semana de performance.
          </span>
        </div>
      )}

      {periodo === 'semana' && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>⏳</span>
          <span style={{ fontSize: 12, color: '#92400E', lineHeight: 1.55 }}>
            <strong>Erros em processamento:</strong> novos erros operacionais podem ser identificados e adicionados até o encerramento do ciclo de performance da semana. Os valores exibidos podem sofrer ajustes até o fechamento.
          </span>
        </div>
      )}

      {erro && <div className="error-banner">⚠ {erro}</div>}
      {loading && <div className="loading-state"><div className="spinner" /><span>Carregando...</span></div>}

      {!loading && dados && (() => {
        const isSemana = periodo === 'semana' || periodo === 'semana_ant'
        const errosNormais = isSemana ? (dados.pedidos || []).filter(p => p.tipo_erro === 'normal').length : 0
        const errosGraves  = isSemana ? (dados.pedidos || []).filter(p => p.tipo_erro === 'grave').length : 0
        const temErros = isSemana && (errosNormais + errosGraves) > 0
        return (
        <>
          {/* Métricas de escopo (Supervisor / TL) — base do bônus */}
          {dados.stats_escopo && (
            <KpiGroup
              stats={dados.stats_escopo}
              size="normal"
              label={escopoTipo === 'loja' ? 'Desempenho da loja' : 'Desempenho do turno'}
              badge="Base do bônus"
            />
          )}

          {/* Métricas individuais */}
          <KpiGroup
            stats={dados.stats}
            size={dados.stats_escopo ? 'small' : 'normal'}
            label="Desempenho individual"
          />

          {/* KPIs de erros — semanas */}
          {isSemana && (
            <>
              <SectionLabel>Erros ao cliente</SectionLabel>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <KpiCard
                  label="Erros"
                  value={errosNormais}
                  sub="−R$ 10,23 por pedido"
                  color={errosNormais > 0 ? 'var(--yellow)' : undefined}
                />
                <KpiCard
                  label="Erros graves"
                  value={errosGraves}
                  sub="−R$ 15,34 por pedido"
                  color={errosGraves > 0 ? 'var(--red)' : undefined}
                />
                <KpiCard
                  label="Total de erros"
                  value={errosNormais + errosGraves}
                  sub={temErros ? `−R$ ${((errosNormais * 10.23) + (errosGraves * 15.34)).toFixed(2).replace('.', ',')}` : 'sem desconto'}
                  color={(errosNormais + errosGraves) > 0 ? 'var(--red)' : 'var(--green)'}
                />
              </div>
            </>
          )}

          {/* Barra SLA — individual */}
          {dados.stats && (
            <BarraSLA comSla={dados.stats.pedidos_com_sla} semSla={dados.stats.pedidos_sem_sla} />
          )}

          {/* Tabela */}
          {dados.pedidos?.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 8, marginTop: 4 }}>
                Pedidos do período ({dados.pedidos.length})
              </div>
              <TabelaPedidos pedidos={dados.pedidos} showErro={isSemana} />
            </>
          )}
          {dados.pedidos?.length === 0 && (
            <div className="empty-state empty-state--full">Nenhum pedido neste período.</div>
          )}

          {/* Aviso pedidos desconsiderados */}
          <div style={{ marginTop: 20, borderLeft: '3px solid #ef4444', background: 'var(--surface)', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span>⚠️</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Pedidos que podem ser desconsiderados</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              Em situações onde são identificadas <strong>instabilidades operacionais</strong> — como falhas de sistema, problemas de integração ou eventos externos — que dificultaram o cumprimento de processos de SLA e rupturas, alguns pedidos podem ser desconsiderados do cálculo. Nesses casos, a exclusão é aplicada manualmente e comunicada antes do fechamento da semana.
            </p>
          </div>
        </>
        )
      })()}
    </div>
  )
}

// ─── página ───────────────────────────────────────────────────────────────────

export default function MeuDesempenhoPage({ user, onVoltar, onLogout }) {
  const [selecionado, setSelecionado] = useState(null)
  const firstName = user?.name?.split(' ')[0] || ''

  return (
    <div className="intraday-layout">
      <div className="intraday-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-performance" onClick={onVoltar}>← Menu</button>
          <div className="intraday-topbar__brand">
            <img src="/shopper-icon.avif" alt="Shopper" className="topbar-icon" />
            <div className="brand-divider" />
            <div>
              <div className="brand-label">SHOPPER</div>
              <div className="brand-title">Feedbacks Diários</div>
            </div>
          </div>
        </div>
        <div className="intraday-topbar__right">
          {user && (
            <div className="topbar-user">
              {user.picture && <img src={user.picture} alt={user.name} className="topbar-avatar" referrerPolicy="no-referrer" />}
              <span className="topbar-username">{firstName}</span>
              <button className="btn-logout" onClick={onLogout}>Sair</button>
            </div>
          )}
        </div>
      </div>

      <div className="intraday-content">
        {selecionado
          ? <DesempenhoIndividual colaborador={selecionado} onVoltar={() => setSelecionado(null)} />
          : <PickerColaboradores onSelecionar={setSelecionado} />
        }
      </div>
    </div>
  )
}
