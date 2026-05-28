/**
 * Badge de status para pedidos / SLA / saúde da loja.
 * variant: 'critico' | 'atencao' | 'saudavel' | 'em_andamento' | 'nao_se_aplica' | 'dentro_sla' | 'fora_sla'
 */
export default function StatusBadge({ label, variant }) {
  return (
    <span className={`badge badge--${variant}`}>{label}</span>
  )
}

/**
 * Calcula a saúde de uma loja com base no % SLA e % ruptura.
 * Retorna: { variant, label }
 */
export function calcSaude(loja) {
  const total = Number(loja.total_pedidos) || 0
  if (total === 0) return { variant: 'nao_se_aplica', label: 'SEM DADOS' }

  const comSla      = Number(loja.pedidos_com_sla)     || 0
  const dentroSla   = Number(loja.pedidos_dentro_sla)  || 0
  const comRuptura  = Number(loja.pedidos_com_ruptura) || 0
  const finalizados = Number(loja.pedidos_finalizados) || 0
  const comFoto     = Number(loja.pedidos_com_foto)    || 0

  const pctSla     = comSla > 0 ? (dentroSla / comSla) * 100 : 100
  const pctRuptura = total > 0 ? (comRuptura / total) * 100 : 0
  const pctFoto    = finalizados > 0 ? (comFoto / finalizados) * 100 : 100

  // Crítico: SLA < 92% OU ruptura >= 5% OU foto < 80%
  if (pctSla < 92 || pctRuptura >= 5 || pctFoto < 80)
    return { variant: 'critico', label: 'CRÍTICO' }

  // Atenção: SLA < 95% OU ruptura >= 2% OU foto < 90%
  if (pctSla < 95 || pctRuptura >= 2 || pctFoto < 90)
    return { variant: 'atencao', label: 'ATENÇÃO' }

  // Saudável: SLA >= 95% E ruptura < 2% E foto >= 90%
  return { variant: 'saudavel', label: 'SAUDÁVEL' }
}
