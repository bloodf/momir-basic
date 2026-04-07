import { tokenize, applyTokens } from '../../utils/searchTokenizer'
import { EMPTY_FILTERS } from '../../components/SearchFilters.shared'

describe('tokenize', () => {
  it('plain text → text token only', () => {
    const tokens = tokenize('goblin')
    expect(tokens).toEqual([{ kind: 'text', value: 'goblin' }])
  })

  it('c:wu → two color tokens + text', () => {
    const tokens = tokenize('c:wu goblin')
    expect(tokens).toEqual([
      { kind: 'color', value: 'W' },
      { kind: 'color', value: 'U' },
      { kind: 'text', value: 'goblin' },
    ])
  })

  it('t:creature r:mythic a:"Rebecca Guay" → filter tokens, empty text', () => {
    const tokens = tokenize('t:creature r:mythic a:"Rebecca Guay"')
    expect(tokens).toEqual([
      { kind: 'type', value: 'creature' },
      { kind: 'rarity', value: 'mythic' },
      { kind: 'artist', value: 'Rebecca Guay' },
    ])
  })

  it('mv<=3 c:r → cmc + one color', () => {
    const tokens = tokenize('mv<=3 c:r')
    expect(tokens).toEqual([
      { kind: 'cmc', operator: '<=', value: '3' },
      { kind: 'color', value: 'R' },
    ])
  })

  it('C:U uppercase → color token U', () => {
    const tokens = tokenize('C:U')
    expect(tokens).toEqual([{ kind: 'color', value: 'U' }])
  })

  it('foo:bar unknown prefix → text token', () => {
    const tokens = tokenize('foo:bar')
    expect(tokens).toEqual([{ kind: 'text', value: 'foo:bar' }])
  })
})

describe('applyTokens', () => {
  it('merges color tokens without duplicates', () => {
    const base = { ...EMPTY_FILTERS, colors: ['W'] }
    const tokens = tokenize('c:wu')
    const { filters } = applyTokens(tokens, base)
    // W already in base, U is new
    expect(filters.colors).toEqual(['W', 'U'])
  })

  it('returns text remainder joined by spaces', () => {
    const tokens = tokenize('c:u goblin wizard')
    const { filters, text } = applyTokens(tokens, EMPTY_FILTERS)
    expect(filters.colors).toEqual(['U'])
    expect(text).toBe('goblin wizard')
  })

  it('full round-trip: t:creature r:mythic → empty text', () => {
    const tokens = tokenize('t:creature r:mythic a:"Rebecca Guay"')
    const { filters, text } = applyTokens(tokens, EMPTY_FILTERS)
    expect(filters.type).toBe('creature')
    expect(filters.rarity).toBe('mythic')
    expect(filters.artist).toBe('Rebecca Guay')
    expect(text).toBe('')
  })

  it('cmc operator stored correctly', () => {
    const tokens = tokenize('mv<=3')
    const { filters } = applyTokens(tokens, EMPTY_FILTERS)
    expect(filters.cmcValue).toBe('3')
    expect(filters.cmcOperator).toBe('<=')
  })
})
