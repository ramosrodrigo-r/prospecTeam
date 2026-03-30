import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { validateEnv } from '../../src/utils/env.js'

describe('validateEnv', () => {
  let originalKey
  let originalEvolutionApiUrl
  let originalEvolutionApiKey
  let originalEvolutionInstance

  beforeEach(() => {
    originalKey = process.env.GOOGLE_PLACES_API_KEY
    originalEvolutionApiUrl = process.env.EVOLUTION_API_URL
    originalEvolutionApiKey = process.env.EVOLUTION_API_KEY
    originalEvolutionInstance = process.env.EVOLUTION_INSTANCE
  })

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.GOOGLE_PLACES_API_KEY
    } else {
      process.env.GOOGLE_PLACES_API_KEY = originalKey
    }
    if (originalEvolutionApiUrl === undefined) {
      delete process.env.EVOLUTION_API_URL
    } else {
      process.env.EVOLUTION_API_URL = originalEvolutionApiUrl
    }
    if (originalEvolutionApiKey === undefined) {
      delete process.env.EVOLUTION_API_KEY
    } else {
      process.env.EVOLUTION_API_KEY = originalEvolutionApiKey
    }
    if (originalEvolutionInstance === undefined) {
      delete process.env.EVOLUTION_INSTANCE
    } else {
      process.env.EVOLUTION_INSTANCE = originalEvolutionInstance
    }
  })

  // Helper to set all 4 vars
  function setAllVars() {
    process.env.GOOGLE_PLACES_API_KEY = 'test-google-key'
    process.env.EVOLUTION_API_URL = 'http://localhost:8080'
    process.env.EVOLUTION_API_KEY = 'test-evolution-key'
    process.env.EVOLUTION_INSTANCE = 'test-instance'
  }

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

  describe('validateEnv — Evolution API vars', () => {
    it('retorna objeto { apiKey, evolutionApiUrl, evolutionApiKey, evolutionInstance } quando todas as 4 vars estao setadas', () => {
      setAllVars()
      const result = validateEnv()
      assert.deepStrictEqual(result, {
        apiKey: 'test-google-key',
        evolutionApiUrl: 'http://localhost:8080',
        evolutionApiKey: 'test-evolution-key',
        evolutionInstance: 'test-instance'
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

    it('lanca Error mencionando EVOLUTION_INSTANCE quando essa var esta ausente', () => {
      setAllVars()
      delete process.env.EVOLUTION_INSTANCE
      assert.throws(() => validateEnv(), (err) => {
        assert.ok(err.message.includes('EVOLUTION_INSTANCE'))
        return true
      })
    })
  })
})
