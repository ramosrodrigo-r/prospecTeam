import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { checkConnection, sendTextMessage } from '../../src/services/evolution.js'

describe('checkConnection', () => {
  let originalFetch
  let capturedUrl
  let capturedOpts

  beforeEach(() => {
    originalFetch = globalThis.fetch
    capturedUrl = null
    capturedOpts = null
    globalThis.fetch = async (url, opts) => {
      capturedUrl = url
      capturedOpts = opts
      return {
        ok: true,
        json: async () => ({ instance: 'connected' }),
        text: async () => ''
      }
    }
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('faz fetch para a URL correta com header apikey', async () => {
    const baseUrl = 'http://localhost:8080'
    const apiKey = 'test-key'
    await checkConnection({ baseUrl, apiKey })
    assert.equal(capturedUrl, `${baseUrl}/instance/status`)
    assert.equal(capturedOpts.headers.apikey, apiKey)
  })

  it('retorna JSON parseado quando response.ok === true', async () => {
    const result = await checkConnection({ baseUrl: 'http://localhost:8080', apiKey: 'k' })
    assert.deepStrictEqual(result, { instance: 'connected' })
  })

  it('lanca Error com status code quando response.ok === false', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized'
    })
    await assert.rejects(
      () => checkConnection({ baseUrl: 'http://localhost:8080', apiKey: 'k' }),
      (err) => {
        assert.ok(err.message.includes('401'))
        return true
      }
    )
  })

  it('passa signal de AbortController ao fetch', async () => {
    let capturedSignal = undefined
    globalThis.fetch = async (url, opts) => {
      capturedSignal = opts.signal
      return { ok: true, json: async () => ({}), text: async () => '' }
    }
    await checkConnection({ baseUrl: 'http://localhost:8080', apiKey: 'k' })
    assert.ok(capturedSignal instanceof AbortSignal, 'signal deve ser uma instancia de AbortSignal')
  })

  it('limpa timeout via clearTimeout apos sucesso', async () => {
    let clearTimeoutCalled = false
    const originalClearTimeout = globalThis.clearTimeout
    globalThis.clearTimeout = (id) => {
      clearTimeoutCalled = true
      originalClearTimeout(id)
    }
    try {
      await checkConnection({ baseUrl: 'http://localhost:8080', apiKey: 'k' })
      assert.ok(clearTimeoutCalled, 'clearTimeout deve ter sido chamado')
    } finally {
      globalThis.clearTimeout = originalClearTimeout
    }
  })
})

describe('sendTextMessage', () => {
  let originalFetch
  let capturedUrl
  let capturedOpts

  beforeEach(() => {
    originalFetch = globalThis.fetch
    capturedUrl = null
    capturedOpts = null
    globalThis.fetch = async (url, opts) => {
      capturedUrl = url
      capturedOpts = opts
      return {
        ok: true,
        json: async () => ({ key: 'value' }),
        text: async () => ''
      }
    }
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('faz POST para a URL correta com headers corretos e body', async () => {
    const baseUrl = 'http://localhost:8080'
    const apiKey = 'test-key'
    const number = '5511999998888'
    const text = 'Hello, World!'
    await sendTextMessage({ baseUrl, apiKey, number, text })
    assert.equal(capturedUrl, `${baseUrl}/send/text`)
    assert.equal(capturedOpts.method, 'POST')
    assert.equal(capturedOpts.headers['Content-Type'], 'application/json')
    assert.equal(capturedOpts.headers.apikey, apiKey)
    const body = JSON.parse(capturedOpts.body)
    assert.equal(body.number, number)
    assert.equal(body.text, text)
  })

  it('retorna JSON parseado em sucesso', async () => {
    const result = await sendTextMessage({
      baseUrl: 'http://localhost:8080',
      apiKey: 'k',
      number: '5511999998888',
      text: 'test'
    })
    assert.deepStrictEqual(result, { key: 'value' })
  })

  it('lanca Error com status code quando response.ok === false', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    })
    await assert.rejects(
      () => sendTextMessage({ baseUrl: 'http://localhost:8080', apiKey: 'k', number: 'n', text: 't' }),
      (err) => {
        assert.ok(err.message.includes('500'))
        return true
      }
    )
  })
})
