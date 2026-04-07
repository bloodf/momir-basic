import { type SearchFilterState, EMPTY_FILTERS } from '@/components/SearchFilters.shared'

export type Token =
  | { kind: 'text'; value: string }
  | { kind: 'color'; value: string }
  | { kind: 'type'; value: string }
  | { kind: 'rarity'; value: string }
  | { kind: 'format'; value: string }
  | { kind: 'set'; value: string }
  | { kind: 'artist'; value: string }
  | { kind: 'cmc'; operator: '=' | '<=' | '>='; value: string }

// Pattern 1: colon-style  — prefix:value or prefix:"quoted value"
//   prefix: color, artist, rarity, format, type, set, c, t, r, f, s, a
//           mv:, cmc:, mv=, mv<=, mv>=, cmc=, cmc<=, cmc>=
// Pattern 2: inline-operator — mv<=N, mv>=N, mv=N, cmc<=N, cmc>=N, cmc=N  (no colon)
const COLON_TOKEN_RE =
  /\b(color|artist|rarity|format|type|set|c|t|r|f|s|a|mv(?:<=|>=|=|:)|cmc(?:<=|>=|=|:)):("(?:[^"\\]|\\.)*"|[^\s]+)/gi

const INLINE_CMC_RE = /\b(mv|cmc)(<=|>=|=)(\d+)/gi

export function tokenize(input: string): Token[] {
  // First, replace inline-cmc forms with a normalised colon form so a single
  // pass can process everything.  e.g. "mv<=3" → "mv<=:3"
  // We use a sentinel separator ":" so the colon regex picks it up.
  const normalised = input.replace(
    new RegExp(INLINE_CMC_RE.source, 'gi'),
    (_m, _kw, op, val) => `${_kw}${op}:${val}`,
  )

  const tokens: Token[] = []
  let lastIndex = 0
  const re = new RegExp(COLON_TOKEN_RE.source, 'gi')
  let match: RegExpExecArray | null

  while ((match = re.exec(normalised)) !== null) {
    // Collect any text before this match
    if (match.index > lastIndex) {
      const text = normalised.slice(lastIndex, match.index).trim()
      if (text) {
        for (const word of text.split(/\s+/)) {
          if (word) tokens.push({ kind: 'text', value: word })
        }
      }
    }

    const prefix = match[1].toLowerCase()
    let rawValue = match[2]
    // Strip surrounding quotes
    if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      rawValue = rawValue.slice(1, -1)
    }
    const value = rawValue

    if (prefix === 'c' || prefix === 'color') {
      // Split each character as its own color token
      for (const ch of value.toUpperCase()) {
        tokens.push({ kind: 'color', value: ch })
      }
    } else if (prefix === 't' || prefix === 'type') {
      tokens.push({ kind: 'type', value: value.toLowerCase() })
    } else if (prefix === 'r' || prefix === 'rarity') {
      tokens.push({ kind: 'rarity', value: value.toLowerCase() })
    } else if (prefix === 'f' || prefix === 'format') {
      tokens.push({ kind: 'format', value: value.toLowerCase() })
    } else if (prefix === 's' || prefix === 'set') {
      tokens.push({ kind: 'set', value: value.toLowerCase() })
    } else if (prefix === 'a' || prefix === 'artist') {
      tokens.push({ kind: 'artist', value })
    } else {
      // mv / cmc variants — operator is embedded in the prefix string
      const op = resolveCmcOperator(prefix)
      tokens.push({ kind: 'cmc', operator: op, value })
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text after last match
  if (lastIndex < normalised.length) {
    const tail = normalised.slice(lastIndex).trim()
    for (const word of tail.split(/\s+/)) {
      if (word) tokens.push({ kind: 'text', value: word })
    }
  }

  return tokens
}

function resolveCmcOperator(prefix: string): '=' | '<=' | '>=' {
  if (prefix.endsWith('<=')) return '<='
  if (prefix.endsWith('>=')) return '>='
  return '='
}

export function applyTokens(
  tokens: Token[],
  base: SearchFilterState,
): { filters: SearchFilterState; text: string } {
  let filters: SearchFilterState = { ...base }
  const textParts: string[] = []

  for (const token of tokens) {
    switch (token.kind) {
      case 'color': {
        if (!filters.colors.includes(token.value)) {
          filters = { ...filters, colors: [...filters.colors, token.value] }
        }
        break
      }
      case 'type':
        filters = { ...filters, type: token.value }
        break
      case 'rarity':
        filters = { ...filters, rarity: token.value }
        break
      case 'format':
        filters = { ...filters, format: token.value }
        break
      case 'set':
        filters = { ...filters, set: token.value }
        break
      case 'artist':
        filters = { ...filters, artist: token.value }
        break
      case 'cmc':
        filters = { ...filters, cmcValue: token.value, cmcOperator: token.operator }
        break
      case 'text':
        textParts.push(token.value)
        break
    }
  }

  return { filters, text: textParts.join(' ') }
}

export { EMPTY_FILTERS }
