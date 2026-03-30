import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { loadHistory } from '../../src/history.js'
import { dedupProspects } from '../../src/stages/dedup.js'

const HISTORY_FILE = './data/history.json'

describe('dedupProspects', () => {
  beforeEach(() => {
    mkdirSync('./data', { recursive: true })
    try { rmSync(HISTORY_FILE) } catch {}
  })

  afterEach(() => {
    try { rmSync(HISTORY_FILE) } catch {}
    try { rmSync(HISTORY_FILE + '.tmp') } catch {}
  })

  it('retorna array vazio para input vazio', () => {
    loadHistory()
    assert.deepEqual(dedupProspects([]), [])
  })

  it('retorna todos os prospects quando historico esta vazio', () => {
    loadHistory()
    const prospects = [{ placeId: 'A', name: 'A' }, { placeId: 'B', name: 'B' }]
    assert.equal(dedupProspects(prospects).length, 2)
  })

  it('filtra prospects ja no historico', () => {
    writeFileSync(HISTORY_FILE, JSON.stringify({ A: { sentAt: '2026-01-01T00:00:00.000Z' } }), 'utf8')
    loadHistory()
    const prospects = [{ placeId: 'A', name: 'A' }, { placeId: 'B', name: 'B' }]
    const result = dedupProspects(prospects)
    assert.equal(result.length, 1)
    assert.equal(result[0].placeId, 'B')
  })

  it('retorna vazio quando todos sao duplicatas', () => {
    writeFileSync(HISTORY_FILE, JSON.stringify({
      X: { sentAt: '2026-01-01T00:00:00.000Z' },
      Y: { sentAt: '2026-01-01T00:00:00.000Z' }
    }), 'utf8')
    loadHistory()
    const prospects = [{ placeId: 'X' }, { placeId: 'Y' }]
    assert.equal(dedupProspects(prospects).length, 0)
  })

  it('preserva todas as propriedades do prospect no retorno', () => {
    loadHistory()
    const prospect = { placeId: 'Z', name: 'Padaria', rating: 4.2, phone: '11999', website: null, email: null }
    const result = dedupProspects([prospect])
    assert.deepEqual(result[0], prospect)
  })
})
