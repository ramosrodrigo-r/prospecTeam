import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { sendWhatsApp } from '../../src/stages/sender.js'

const prospect = { placeId: 'place123', name: 'Test Biz', phone: '5511999998888' }
const message = 'Ola, Test Biz!'
const config = { baseUrl: 'http://localhost:8080', apiKey: 'test-key', instance: 'test-instance' }

describe('sendWhatsApp', () => {
  let originalSetTimeout
  let recordSendCalls
  let mockSendTextMessage
  let mockRecordSend
  let deps

  beforeEach(() => {
    originalSetTimeout = globalThis.setTimeout
    recordSendCalls = []

    // Default: sendTextMessage resolves successfully
    mockSendTextMessage = async () => ({ messageId: 'msg1' })
    mockRecordSend = (placeId, channel) => { recordSendCalls.push({ placeId, channel }) }

    // Default mock: setTimeout resolves immediately
    globalThis.setTimeout = (fn, delay) => {
      fn()
      return 1
    }

    deps = { sendTextMessage: mockSendTextMessage, recordSend: mockRecordSend }
  })

  afterEach(() => {
    globalThis.setTimeout = originalSetTimeout
  })

  it('retorna { ok: true } quando sendTextMessage resolve', async () => {
    const result = await sendWhatsApp(prospect, message, config, deps)
    assert.deepStrictEqual(result, { ok: true })
  })

  it('chama recordSend(prospect.placeId, \'wa\') quando sendTextMessage resolve', async () => {
    await sendWhatsApp(prospect, message, config, deps)
    assert.equal(recordSendCalls.length, 1)
    assert.equal(recordSendCalls[0].placeId, prospect.placeId)
    assert.equal(recordSendCalls[0].channel, 'wa')
  })

  it('retorna { ok: false, reason } quando sendTextMessage rejeita', async () => {
    deps.sendTextMessage = async () => { throw new Error('Evolution API error 500: Internal Server Error') }
    const result = await sendWhatsApp(prospect, message, config, deps)
    assert.equal(result.ok, false)
    assert.ok(typeof result.reason === 'string' && result.reason.length > 0, 'reason deve ser string nao vazia')
    assert.ok(result.reason.includes('500'))
  })

  it('NAO chama recordSend quando sendTextMessage rejeita', async () => {
    deps.sendTextMessage = async () => { throw new Error('send failed') }
    await sendWhatsApp(prospect, message, config, deps)
    assert.equal(recordSendCalls.length, 0)
  })

  it('aplica delay >= 3000ms e <= 8000ms apos envio bem-sucedido', async () => {
    let capturedDelay = null
    globalThis.setTimeout = (fn, delay) => {
      capturedDelay = delay
      fn()
      return 1
    }
    await sendWhatsApp(prospect, message, config, deps)
    assert.ok(capturedDelay !== null, 'setTimeout deve ter sido chamado')
    assert.ok(capturedDelay >= 3000, `delay deve ser >= 3000ms, mas foi ${capturedDelay}`)
    assert.ok(capturedDelay <= 8000, `delay deve ser <= 8000ms, mas foi ${capturedDelay}`)
  })
})
