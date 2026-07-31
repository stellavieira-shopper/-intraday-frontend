/**
 * Normaliza o nome da loja:
 *  - Remove prefixo numérico/FC: "1 - Vila Mariana" → "Vila Mariana"
 *  - Renomeia aliases conhecidos
 */
const ALIASES = {
  PAMPLONA:            'Jardins',
  HIGIENOPOLIS:        'Higienópolis',
  'SAO CAETANO':       'São Caetano',
  'VILA OLIMPIA':      'Vila Olímpia',
  'VILA MARIANA':      'Vila Mariana',
  'BARRA FUNDA':       'Barra Funda',
  'ALTO DE PINHEIROS': 'Alto de Pinheiros',
  MORUMBI:             'Morumbi',
  PINHEIROS:           'Pinheiros',
  BROOKLIN:            'Brooklin',
  CAMPINAS:            'Campinas',
  MOEMA:               'Moema',
  'VILA GUILHERME':    'Vila Guilherme',
  CONSOLACAO:          'Consolação',
  MOOCA:               'Mooca',
  TATUAPE:             'Tatuapé',
  'RIBEIRAO PRETO':    'Ribeirão Preto',
  CURITIBA:            'Curitiba',
  'PR - REPUBLICA':    'República (CWB)',
  'PR - RODOVIA':      'Rodovia (CWB)',
  'PR - STRESSER':     'Stresser (CWB)',
}

export function nomeLoja(raw) {
  if (!raw) return raw ?? ''
  // Remove qualquer prefixo de código: "LJ09 - ", "FC 5 - ", "1 - ", etc.
  let nome = String(raw)
    .replace(/^[A-Z0-9]+\s*[-–]\s*/i, '')
    .trim()
  const upper = nome.toUpperCase()
  if (ALIASES[upper]) return ALIASES[upper]
  return nome
}
