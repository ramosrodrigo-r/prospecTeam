import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'

// Mock history module before importing sender to intercept recordSend
let recordSendCalls = []
await mock.module('../../src/history.js', {
  namedExports: {
    recordSend: (placeId) => { recordSendCalls.push(placeId) },
    loadHistory: () => {},
    isDuplicate: () => false
  }
})

// Import sendWhatsApp after mock is registered
const { sendWhatsApp } = await import('../../src/stages/sender.js')

const prospect = { placeId: 'place123', name: 'Test Biz', phone: '5511999998888' }
const message = 'Ola, Test Biz!'
const config = { baseUrl: 'http://localhost:8080', apiKey: 'test-key', instance: 'test-instance' }

describe('sendWhatsApp', () => {
  let originalFetch
  let originalSetTimeout

  beforeEach(() => {
    originalFetch = globalThis.fetch
    originalSetTimeout = globalThis.setTimeout
    recordSendCalls = []

    // Default mock: setTimeout that resolves immediately
    globalThis.setTimeout = (fn, delay) => {
      fn()
      return 1
    }
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    globalThis.setTimeout = originalSetTimeout
  })

  it('retorna { ok: true } quando sendTextMessage resolve', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ messageId: 'msg1' }),
      text: async () => ''
    })
    const result = await sendWhatsApp(prospect, message, config)
    assert.deepStrictEqual(result, { ok: true })
  })

  it('chama recordSend(prospect.placeId) quando sendTextMessage resolve', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({}),
      text: async () => ''
    })
    await sendWhatsApp(prospect, message, config)
    assert.equal(recordSendCalls.length, 1)
    assert.equal(recordSendCalls[0], prospect.placeId)
  })

  it('retorna { ok: false, reason } quando sendTextMessage rejeita', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    })
    const result = await sendWhatsApp(prospect, message, config)
    assert.equal(result.ok, false)
    assert.ok(typeof result.reason === 'string' && result.reason.length > 0, 'reason deve ser string nao vazia')
  })

  it('NAO chama recordSend quando sendTextMessage rejeita', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      text: async () => 'Error'
    })
    await sendWhatsApp(prospect, message, config)
    assert.equal(recordSendCalls.length, 0)
  })

  it('aplica delay >= 3000ms e <= 8000ms apos envio bem-sucedido', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({}),
      text: async () => ''
    })
    let capturedDelay = null
    globalThis.setTimeout = (fn, delay) => {
      capturedDelay = delay
      fn()
      return 1
    }
    await sendWhatsApp(prospect, message, config)
    assert.ok(capturedDelay !== null, 'setTimeout deve ter sido chamado')
    assert.ok(capturedDelay >= 3000, `delay deve ser >= 3000ms, mas foi ${capturedDelay}`)
    assert.ok(capturedDelay <= 8000, `delay deve ser <= 8000ms, mas foi ${capturedDelay}`)
  })
})
