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
    assert.equal(isDuplicate('ChIJunknown', 'wa'), false)
  })

  it('isDuplicate retorna false para canal nao enviado', () => {
    recordSend('ChIJ1', 'wa')
    assert.equal(isDuplicate('ChIJ1', 'email'), false)
  })

  it('loadHistory carrega entries de arquivo existente', () => {
    writeFileSync(HISTORY_FILE, JSON.stringify({ 'ChIJ123': { wa: '2026-01-01T00:00:00.000Z', email: null } }), 'utf8')
    loadHistory()
    assert.equal(isDuplicate('ChIJ123', 'wa'), true)
  })

  it('recordSend persiste entry em history.json', () => {
    recordSend('ChIJnew', 'wa')
    const raw = readFileSync(HISTORY_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    assert.ok('ChIJnew' in parsed)
    assert.equal(typeof parsed['ChIJnew'].wa, 'string')
  })

  it('recordSend faz isDuplicate retornar true imediatamente', () => {
    recordSend('ChIJfresh', 'wa')
    assert.equal(isDuplicate('ChIJfresh', 'wa'), true)
  })

  it('recordSend nao apaga entries existentes', () => {
    writeFileSync(HISTORY_FILE, JSON.stringify({ 'ChIJold': { wa: '2026-01-01T00:00:00.000Z', email: null } }), 'utf8')
    loadHistory()
    recordSend('ChIJnew', 'wa')
    const raw = readFileSync(HISTORY_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    assert.ok('ChIJold' in parsed)
    assert.ok('ChIJnew' in parsed)
  })

  it('recordSend usa write-then-rename (history.json valido)', () => {
    recordSend('ChIJtest', 'wa')
    assert.ok(existsSync(HISTORY_FILE))
    assert.doesNotThrow(() => JSON.parse(readFileSync(HISTORY_FILE, 'utf8')))
    assert.equal(existsSync(HISTORY_TMP), false)
  })

  it('loadHistory cria diretorio data/ se nao existir', () => {
    rmSync('./data', { recursive: true, force: true })
    loadHistory()
    assert.ok(existsSync('./data'))
  })

  it('recordSend email nao sobrescreve wa existente', () => {
    recordSend('ChIJ1', 'wa')
    recordSend('ChIJ1', 'email')
    const raw = readFileSync(HISTORY_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    assert.equal(typeof parsed['ChIJ1'].wa, 'string')
    assert.equal(typeof parsed['ChIJ1'].email, 'string')
  })

  it('loadHistory migra schema antigo sentAt para wa+email', () => {
    writeFileSync(HISTORY_FILE, JSON.stringify({ 'ChIJold': { sentAt: '2026-01-01T00:00:00.000Z' } }), 'utf8')
    loadHistory()
    assert.equal(isDuplicate('ChIJold', 'wa'), true)
    assert.equal(isDuplicate('ChIJold', 'email'), false)
  })

  it('loadHistory nao migra schema novo', () => {
    writeFileSync(HISTORY_FILE, JSON.stringify({ 'ChIJnew': { wa: '2026-01-01T00:00:00.000Z', email: '2026-02-01T00:00:00.000Z' } }), 'utf8')
    loadHistory()
    assert.equal(isDuplicate('ChIJnew', 'wa'), true)
    assert.equal(isDuplicate('ChIJnew', 'email'), true)
  })

  it('recordSend persiste schema channel-aware', () => {
    recordSend('ChIJ1', 'email')
    const raw = readFileSync(HISTORY_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    assert.equal(typeof parsed['ChIJ1'].email, 'string')
    assert.equal(parsed['ChIJ1'].wa, null)
  })
})
