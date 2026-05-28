/**
 * Normaliza o nome da loja:
 *  - Remove prefixo numérico/FC: "1 - Vila Mariana" → "Vila Mariana"
 *  - Renomeia aliases conhecidos
 */
const ALIASES = {
  PAMPLONA: 'Jardins',
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
