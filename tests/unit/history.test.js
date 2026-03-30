import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, rmSync, mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { loadHistory, isDuplicate, recordSend } from '../../src/history.js'

const HISTORY_FILE = './data/history.json'
const HISTORY_TMP = './data/history.json.tmp'

describe('history', () => {
  beforeEach(() => {
    // Garantir diretorio existe e limpar arquivo
    mkdirSync('./data', { recursive: true })
    try { rmSync(HISTORY_FILE) } catch {}
    try { rmSync(HISTORY_TMP) } catch {}
    loadHistory()  // reinicializa Map interno
  })

  afterEach(() => {
    try { rmSync(HISTORY_FILE) } catch {}
    try { rmSync(HISTORY_TMP) } catch {}
  })

  it('loadHistory no arquivo inexistente nao lanca erro', () => {
    try { rmSync(HISTORY_FILE) } catch {}
    assert.doesNotThrow(() => loadHistory())
  })

  it('isDuplicate retorna false para placeId desconhecido', () => {
    assert.equal(isDuplicate('ChIJunknown'), false)
  })

  it('loadHistory carrega entries de arquivo existente', () => {
    writeFileSync(HISTORY_FILE, JSON.stringify({ 'ChIJ123': { sentAt: '2026-01-01T00:00:00.000Z' } }), 'utf8')
    loadHistory()
    assert.equal(isDuplicate('ChIJ123'), true)
  })

  it('recordSend persiste entry em history.json', () => {
    recordSend('ChIJnew')
    const raw = readFileSync(HISTORY_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    assert.ok('ChIJnew' in parsed)
    assert.equal(typeof parsed['ChIJnew'].sentAt, 'string')
  })

  it('recordSend faz isDuplicate retornar true imediatamente', () => {
    recordSend('ChIJfresh')
    assert.equal(isDuplicate('ChIJfresh'), true)
  })

  it('recordSend nao apaga entries existentes', () => {
    writeFileSync(HISTORY_FILE, JSON.stringify({ 'ChIJold': { sentAt: '2026-01-01T00:00:00.000Z' } }), 'utf8')
    loadHistory()
    recordSend('ChIJnew')
    const raw = readFileSync(HISTORY_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    assert.ok('ChIJold' in parsed)
    assert.ok('ChIJnew' in parsed)
  })

  it('recordSend usa write-then-rename (history.json valido)', () => {
    recordSend('ChIJtest')
    assert.ok(existsSync(HISTORY_FILE))
    assert.doesNotThrow(() => JSON.parse(readFileSync(HISTORY_FILE, 'utf8')))
    assert.equal(existsSync(HISTORY_TMP), false)
  })

  it('loadHistory cria diretorio data/ se nao existir', () => {
    rmSync('./data', { recursive: true, force: true })
    loadHistory()
    assert.ok(existsSync('./data'))
  })
})
