import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import TabelaOperadores from '../components/TabelaOperadores.jsx'
import TabelaTurnos from '../components/TabelaTurnos.jsx'
import PedidosRecentes from '../components/PedidosRecentes.jsx'
import TopRupturas from '../components/TopRupturas.jsx'
import DateFilter from '../components/DateFilter.jsx'
import Accordion from '../components/Accordion.jsx'
import { calcSaude } from '../components/StatusBadge.jsx'
import { nomeLoja } from '../utils/nomeLoja.js'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function pctVal(num, den) {
  if (!den || den === 0) return null
  return (num / den) * 100
}

function fmtPeriodo(ini, fim) {
  const fmt = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
  return ini === fim ? fmt(ini) : `${fmt(ini)} → ${fmt(fim)}`
}

function hoje() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

/** Card KPI grande (estilo referência PDF) */
function KpiLoja({ label, value, sup, sub, dotClass, barPct, barClass }) {
  return (
    <div className="loja-kpi-card">
      <div className="loja-kpi-card__header">
        <span className="loja-kpi-card__label">{label}</span>
        <span className={`loja-kpi-dot ${dotClass}`} />
      </div>
      <div className={`loja-kpi-card__value loja-kpi-card__value--${barClass ?? 'gray'}`}>
        {value}{sup && <sup>{sup}</sup>}
      </div>
      <div className="loja-kpi-card__sub">{sub}</div>
      <div className="loja-kpi-bar">
        <div className={`loja-kpi-bar__fill loja-kpi-bar__fill--${barClass ?? 'gray'}`}
          style={{ width: `${Math.min(barPct ?? 0, 100)}%` }} />
      </div>
    </div>
  )
}

export default function Loja({ loja, dataInicio: dataInicioInit, dataFim: dataFimInit, onVoltar, user, onLogout }) {
  const [dataInicio, setDataInicio]         = useState(dataInicioInit)
  const [dataFim, setDataFim]               = useState(dataFimInit)
  const [dados, setDados]                   = useState(null)
  const [loading, setLoading]               = useState(false)
  const [erro, setErro]                     = useState(null)
  const [ultimaAtt, setUltimaAtt]           = useState(null)
  const [filtroOperador, setFiltroOperador] = useState('')

  function handleDateChange({ dataInicio: ini, dataFim: fim }) {
    setDataInicio(ini)
    setDataFim(fim)
  }

  const buscar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const { data: resp } = await axios.get(
        `${API}/api/intraday/loja/${encodeURIComponent(loja)}`,
        { params: { data_inicio: dataInicio, data_fim: dataFim } }
      )
      setDados(resp)
      setUltimaAtt(new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }))
    } catch (e) {
      setErro(e.response?.data?.erro || e.message || 'Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [loja, dataInicio, dataFim])

  useEffect(() => { buscar() }, [buscar])

  const kpis = dados?.kpis || {}
  const saude = calcSaude(kpis)
  const nome = nomeLoja(loja)

  const totalPedidos  = Number(kpis.total_pedidos)       || 0
  const dentroSla     = Number(kpis.pedidos_dentro_sla)  || 0
  const comSla        = Number(kpis.pedidos_com_sla)     || 0
  const foraSla       = Number(kpis.pedidos_fora_sla)    || 0
  const comRuptura    = Number(kpis.pedidos_com_ruptura) || 0
  const finalizados   = Number(kpis.pedidos_finalizados) || 0
  const comFoto       = Number(kpis.pedidos_com_foto)    || 0
  const semFoto       = finalizados - comFoto

  const pctSla     = pctVal(dentroSla, comSla)
  const pctRuptura = pctVal(comRuptura, totalPedidos)
  const pctFoto    = pctVal(comFoto, finalizados)

  const slaColor = pctSla === null ? 'gray' : pctSla >= 85 ? 'green' : pctSla >= 70 ? 'orange' : 'red'
  const rupturaColor = pctRuptura === null ? 'gray' : pctRuptura <= 5 ? 'green' : pctRuptura <= 15 ? 'orange' : 'red'
  const fotoColor = pctFoto === null ? 'gray' : pctFoto >= 70 ? 'green' : pctFoto >= 30 ? 'orange' : 'red'

  const now = new Date()
  const diaSemana = now.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })
  const diaCompleto = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })

  return (
    <div className="intraday-layout">
      {/* Topbar */}
      <div className="intraday-topbar">
        <div className="intraday-topbar__brand">
          <img src="/shopper-icon.avif" alt="Shopper" className="topbar-icon" />
          <div className="brand-divider" />
          <div>
            <div className="brand-label">INTRADAY</div>
            <div className="brand-title">Performance Operacional</div>
          </div>
        </div>
        <div className="intraday-topbar__right">
          <button className="btn-refresh" onClick={buscar} disabled={loading}>
            {loading ? '⏳' : '↺'} Atualizar
          </button>
          {user && (
            <div className="topbar-user">
              {user.picture && <img src={user.picture} alt={user.name} className="topbar-avatar" referrerPolicy="no-referrer" />}
              <span className="topbar-username">{user.name?.split(' ')[0]}</span>
              <button className="btn-logout" onClick={onLogout} title="Sair">Sair</button>
            </div>
          )}
        </div>
      </div>

      {/* Barra de data */}
      <div className="intraday-datebar">
        <div className="intraday-datebar__left">
          <div className="last-update-label">Última atualização</div>
          <div className="last-update-time">{ultimaAtt || '—'}</div>
          <div className="last-update-date">{diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)}, {diaCompleto}</div>
        </div>
        <div className="intraday-datebar__right">
          <DateFilter dataInicio={dataInicio} dataFim={dataFim} onChange={handleDateChange} />
        </div>
      </div>

      {/* Hero da loja */}
      <div className="loja-hero">
        <button className="btn-voltar" onClick={onVoltar} style={{ marginBottom: 12 }}>← Voltar para visão consolidada</button>
        <div className="loja-hero__eyebrow">VISÃO DA LOJA · SUPERVISOR</div>
        <div className="loja-hero__nome">
          <span className={`saude-dot saude-dot--${saude.variant}`} />
          {nome}
        </div>
      </div>

      <div className="intraday-content">
        {erro && <div className="error-banner">⚠ {erro}</div>}

        {loading && !dados && (
          <div className="loading-state">
            <div className="spinner" />
            <span>Carregando dados de {nome}...</span>
          </div>
        )}

        {dados && (
          <>
            {/* KPIs grandes */}
            <div className="loja-kpi-grid">
              <KpiLoja
                label="SLA 5 min (Turbo + Fast)"
                value={pctSla !== null ? pctSla.toFixed(1) : '—'}
                sup={pctSla !== null ? ' %' : ''}
                sub={comSla > 0 ? `${foraSla} de ${comSla} fora do prazo` : 'sem pedidos com SLA'}
                dotClass={`dot--${slaColor}`}
                barPct={pctSla}
                barClass={slaColor}
              />
              <KpiLoja
                label="% com ruptura"
                value={pctRuptura !== null ? pctRuptura.toFixed(1) : '—'}
                sup={pctRuptura !== null ? ' %' : ''}
                sub={`${comRuptura} pedido${comRuptura !== 1 ? 's' : ''} com ruptura`}
                dotClass={`dot--${rupturaColor}`}
                barPct={pctRuptura}
                barClass={rupturaColor}
              />
              <KpiLoja
                label="% com erro"
                value="0.0"
                sup=" %"
                sub="0 pedidos com erro"
                dotClass="dot--green"
                barPct={0}
                barClass="green"
              />
              <KpiLoja
                label="% com foto"
                value={pctFoto !== null ? pctFoto.toFixed(1) : '—'}
                sup={pctFoto !== null ? ' %' : ''}
                sub={finalizados > 0 ? `${semFoto} de ${finalizados} sem foto` : 'sem pedidos finalizados'}
                dotClass={`dot--${fotoColor}`}
                barPct={pctFoto}
                barClass={fotoColor}
              />
              <KpiLoja
                label="Total de pedidos"
                value={String(totalPedidos)}
                sub="Todos os turnos"
                dotClass="dot--gray"
                barPct={100}
                barClass="gray"
              />
            </div>

            {/* Por tipo de pedido */}
            {dados.tipos && dados.tipos.length > 0 && (
              <Accordion title="Por tipo de pedido" subtitle={`${fmtPeriodo(dataInicio, dataFim)} · SLA de 5 min aplica-se a Turbo/Express e Fast Delivery`}>
                <div style={{ overflowX: 'auto', marginTop: 12 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        {['Tipo', 'Total', 'SLA 5 min', 'Ruptura', 'Foto', 'T. Iniciar', 'T. Picking', 'T. Packing', 'T. Ciclo'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dados.tipos.map((t, i) => {
                        const pSla  = t.com_sla > 0 ? ((t.dentro_sla / t.com_sla) * 100).toFixed(1) : null
                        const pRup  = t.total   > 0 ? ((t.com_ruptura / t.total) * 100).toFixed(1)  : '0.0'
                        const pFoto = t.finalizados > 0 ? ((t.com_foto / t.finalizados) * 100).toFixed(1) : null
                        const isTurbo  = t.tipo === 'Turbo / Express'
                        const temSla   = t.com_sla > 0   // Fast Delivery também tem SLA de 5 min
                        const slaColor = pSla === null ? '#94a3b8' : Number(pSla) >= 85 ? 'var(--green)' : Number(pSla) >= 70 ? 'var(--yellow)' : 'var(--red)'
                        const ruptColor = Number(pRup) <= 5 ? 'var(--green)' : Number(pRup) <= 15 ? 'var(--yellow)' : 'var(--red)'
                        const fotoColor = pFoto === null ? '#94a3b8' : Number(pFoto) >= 70 ? 'var(--green)' : Number(pFoto) >= 30 ? 'var(--yellow)' : 'var(--red)'
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'transparent' : '#fafbfc' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                              <span style={{
                                background: isTurbo ? '#dbeafe' : t.tipo === 'Fast Delivery' ? '#ede9fe' : t.tipo === 'Sem classificação' ? '#f1f5f9' : '#f0fdf4',
                                color: isTurbo ? '#1d4ed8' : t.tipo === 'Fast Delivery' ? '#6d28d9' : t.tipo === 'Sem classificação' ? '#64748b' : '#15803d',
                                borderRadius: 4, padding: '3px 10px', fontSize: 12, fontWeight: 700
                              }}>
                                {t.tipo}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 700 }}>{Number(t.total).toLocaleString('pt-BR')}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: slaColor }}>
                              {temSla
                                ? (pSla !== null ? `${pSla}%` : '—')
                                : <span style={{ color: '#94a3b8', fontSize: 12 }}>N/A</span>}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: ruptColor }}>{pRup}%</td>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: fotoColor }}>{pFoto !== null ? `${pFoto}%` : '—'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{t.avg_iniciar_min ?? '—'} min</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{t.avg_picking_min ?? '—'} min</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{t.avg_packing_min ?? '—'} min</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{t.avg_cycle_min ?? '—'} min</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid var(--border)', background: '#f8f9fc' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, fontSize: 12, color: 'var(--text-muted)' }}>TOTAL / GERAL</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>{totalPedidos.toLocaleString('pt-BR')}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: slaColor }}>
                          {pctSla !== null ? `${pctSla.toFixed(1)}%` : '—'}
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>({comSla} com SLA)</span>
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: rupturaColor }}>{pctRuptura !== null ? `${pctRuptura.toFixed(1)}%` : '—'}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: fotoColor }}>{pctFoto !== null ? `${pctFoto.toFixed(1)}%` : '—'}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{kpis.avg_tempo_iniciar_min ?? '—'} min</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{kpis.avg_picking_min ?? '—'} min</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{kpis.avg_packing_min ?? '—'} min</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{kpis.avg_cycle_min ?? '—'} min</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Accordion>
            )}

            {/* Performance por turno */}
            <Accordion title="Performance por turno" subtitle="Toque em um turno para abrir a visão do team leader">
              <div style={{ marginTop: 8 }}>
                <TabelaTurnos turnos={dados.turnos} />
              </div>
            </Accordion>

            {/* Produtos com maior ruptura */}
            <Accordion title="Produtos com maior ruptura" subtitle={`Top ${dados.rupturas?.length ?? 0} · ${fmtPeriodo(dataInicio, dataFim)}`}>
              <div style={{ marginTop: 8 }}>
                <TopRupturas rupturas={dados.rupturas} />
              </div>
            </Accordion>

            {/* Performance por operador */}
            <Accordion title="Performance por operador" subtitle="Busque um colaborador para ver seus KPIs · pior SLA primeiro">
              <div style={{ marginTop: 8 }}>
                <TabelaOperadores
                  operadores={dados.operadores}
                  busca={filtroOperador}
                  onBuscaChange={setFiltroOperador}
                />
              </div>
            </Accordion>

            {/* Pedidos recentes */}
            {(() => {
              const pedidosFiltrados = filtroOperador
                ? (dados.pedidos || []).filter(p =>
                    p.operador?.toLowerCase().includes(filtroOperador.toLowerCase()))
                : (dados.pedidos || [])
              return (
                <Accordion
                  title={filtroOperador ? `Pedidos de ${filtroOperador}` : 'Pedidos recentes'}
                  subtitle={`${pedidosFiltrados.length} pedidos`}
                  defaultOpen={false}
                >
                  <div style={{ marginTop: 8 }}>
                    <PedidosRecentes pedidos={pedidosFiltrados} />
                  </div>
                </Accordion>
              )
            })()}
          </>
        )}
      </div>
    </div>
  )
}
