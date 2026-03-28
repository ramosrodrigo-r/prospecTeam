import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { validateEnv } from '../../src/utils/env.js'

describe('validateEnv', () => {
  let originalKey

  beforeEach(() => {
    originalKey = process.env.GOOGLE_PLACES_API_KEY
  })

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.GOOGLE_PLACES_API_KEY
    } else {
      process.env.GOOGLE_PLACES_API_KEY = originalKey
    }
  })

  it('returns the key when GOOGLE_PLACES_API_KEY is set', () => {
    process.env.GOOGLE_PLACES_API_KEY = 'test-key-123'
    const result = validateEnv()
    assert.equal(result, 'test-key-123')
  })

  it('throws when GOOGLE_PLACES_API_KEY is not set', () => {
    delete process.env.GOOGLE_PLACES_API_KEY
    assert.throws(() => validateEnv(), (err) => {
      assert.ok(err.message.includes('GOOGLE_PLACES_API_KEY'))
      return true
    })
  })

  it('throws when GOOGLE_PLACES_API_KEY is empty string', () => {
    process.env.GOOGLE_PLACES_API_KEY = ''
    assert.throws(() => validateEnv(), (err) => {
      assert.ok(err.message.includes('GOOGLE_PLACES_API_KEY'))
      return true
    })
  })
})
