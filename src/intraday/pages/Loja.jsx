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
                label="% SLA 5 min"
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

            {/* Tempos médios */}
            <Accordion title="Tempos médios da operação" subtitle={`${fmtPeriodo(dataInicio, dataFim)} · todos os turnos`}>
              <div className="tempos-grid" style={{ marginTop: 16 }}>
                <div className="tempo-item">
                  <div className="tempo-item__label">Tempo p/ iniciar picking</div>
                  <div className="tempo-item__value">{kpis.avg_tempo_iniciar_min ?? '—'}<span>min</span></div>
                </div>
                <div className="tempo-item">
                  <div className="tempo-item__label">Tempo médio de picking</div>
                  <div className="tempo-item__value">{kpis.avg_picking_min ?? '—'}<span>min</span></div>
                </div>
                <div className="tempo-item">
                  <div className="tempo-item__label">Tempo médio de packing</div>
                  <div className="tempo-item__value">{kpis.avg_packing_min ?? '—'}<span>min</span></div>
                </div>
                <div className="tempo-item">
                  <div className="tempo-item__label">Tempo médio do ciclo</div>
                  <div className="tempo-item__value">{kpis.avg_cycle_min ?? '—'}<span>min</span></div>
                </div>
              </div>
            </Accordion>

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
