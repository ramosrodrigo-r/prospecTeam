import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { validateEnv } from '../../src/utils/env.js'

describe('validateEnv', () => {
  let originalKey
  let originalEvolutionApiUrl
  let originalEvolutionApiKey
  let originalTelegramBotToken
  let originalTelegramChatId

  beforeEach(() => {
    originalKey = process.env.GOOGLE_PLACES_API_KEY
    originalEvolutionApiUrl = process.env.EVOLUTION_API_URL
    originalEvolutionApiKey = process.env.EVOLUTION_API_KEY
    originalTelegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    originalTelegramChatId = process.env.TELEGRAM_CHAT_ID
  })

  afterEach(() => {
    if (originalKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY
    else process.env.GOOGLE_PLACES_API_KEY = originalKey

    if (originalEvolutionApiUrl === undefined) delete process.env.EVOLUTION_API_URL
    else process.env.EVOLUTION_API_URL = originalEvolutionApiUrl

    if (originalEvolutionApiKey === undefined) delete process.env.EVOLUTION_API_KEY
    else process.env.EVOLUTION_API_KEY = originalEvolutionApiKey

    if (originalTelegramBotToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN
    else process.env.TELEGRAM_BOT_TOKEN = originalTelegramBotToken

    if (originalTelegramChatId === undefined) delete process.env.TELEGRAM_CHAT_ID
    else process.env.TELEGRAM_CHAT_ID = originalTelegramChatId
  })

  function setAllVars() {
    process.env.GOOGLE_PLACES_API_KEY = 'test-google-key'
    process.env.EVOLUTION_API_URL = 'http://localhost:8080'
    process.env.EVOLUTION_API_KEY = 'test-evolution-key'
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token'
    process.env.TELEGRAM_CHAT_ID = '123456789'
  }

  it('retorna objeto com as 5 vars quando todas estao setadas', () => {
    setAllVars()
    const result = validateEnv()
    assert.deepStrictEqual(result, {
      apiKey: 'test-google-key',
      evolutionApiUrl: 'http://localhost:8080',
      evolutionApiKey: 'test-evolution-key',
      telegramBotToken: 'test-bot-token',
      telegramChatId: '123456789',
    })
  })

  it('throws when GOOGLE_PLACES_API_KEY is not set', () => {
    setAllVars()
    delete process.env.GOOGLE_PLACES_API_KEY
    assert.throws(() => validateEnv(), (err) => {
      assert.ok(err.message.includes('GOOGLE_PLACES_API_KEY'))
      return true
    })
  })

  it('throws when GOOGLE_PLACES_API_KEY is empty string', () => {
    setAllVars()
    process.env.GOOGLE_PLACES_API_KEY = ''
    assert.throws(() => validateEnv(), (err) => {
      assert.ok(err.message.includes('GOOGLE_PLACES_API_KEY'))
      return true
    })
  })

  it('lanca Error mencionando EVOLUTION_API_URL quando essa var esta ausente', () => {
    setAllVars()
    delete process.env.EVOLUTION_API_URL
    assert.throws(() => validateEnv(), (err) => {
      assert.ok(err.message.includes('EVOLUTION_API_URL'))
      return true
    })
  })

  it('lanca Error mencionando EVOLUTION_API_KEY quando essa var esta ausente', () => {
    setAllVars()
    delete process.env.EVOLUTION_API_KEY
    assert.throws(() => validateEnv(), (err) => {
      assert.ok(err.message.includes('EVOLUTION_API_KEY'))
      return true
    })
  })

  it('lanca Error mencionando TELEGRAM_BOT_TOKEN quando essa var esta ausente', () => {
    setAllVars()
    delete process.env.TELEGRAM_BOT_TOKEN
    assert.throws(() => validateEnv(), (err) => {
      assert.ok(err.message.includes('TELEGRAM_BOT_TOKEN'))
      return true
    })
  })

  it('lanca Error mencionando TELEGRAM_CHAT_ID quando essa var esta ausente', () => {
    setAllVars()
    delete process.env.TELEGRAM_CHAT_ID
    assert.throws(() => validateEnv(), (err) => {
      assert.ok(err.message.includes('TELEGRAM_CHAT_ID'))
      return true
    })
  })
})
