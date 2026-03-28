import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePhone } from '../../src/utils/phone.js'

describe('normalizePhone', () => {
  it('normalizes full format with +55 and spaces: +55 (11) 98765-4321', () => {
    const result = normalizePhone('+55 (11) 98765-4321')
    assert.equal(result, '5511987654321')
  })

  it('normalizes compact format with +55: +5511987654321', () => {
    const result = normalizePhone('+5511987654321')
    assert.equal(result, '5511987654321')
  })

  it('normalizes parens + dash format without country code: (11) 98765-4321', () => {
    const result = normalizePhone('(11) 98765-4321')
    assert.equal(result, '5511987654321')
  })

  it('normalizes bare 11 digits without separators: 11987654321', () => {
    const result = normalizePhone('11987654321')
    assert.equal(result, '5511987654321')
  })

  it('returns as-is when already E.164 (13 digits starting with 55): 5511987654321', () => {
    const result = normalizePhone('5511987654321')
    assert.equal(result, '5511987654321')
  })

  it('normalizes space-separated format: 11 98765-4321', () => {
    const result = normalizePhone('11 98765-4321')
    assert.equal(result, '5511987654321')
  })

  it('normalizes parens without space before number: (11)987654321', () => {
    const result = normalizePhone('(11)987654321')
    assert.equal(result, '5511987654321')
  })

  it('normalizes landline 8 digits after DDD: (11) 3456-7890 (D-11)', () => {
    const result = normalizePhone('(11) 3456-7890')
    assert.equal(result, '551134567890')
  })

  it('normalizes landline without parens: 11 3456-7890', () => {
    const result = normalizePhone('11 3456-7890')
    assert.equal(result, '551134567890')
  })

  it('returns as-is when landline already has country code (12 digits): 551134567890', () => {
    const result = normalizePhone('551134567890')
    assert.equal(result, '551134567890')
  })

  it('returns null for null input without crashing (D-07)', () => {
    const result = normalizePhone(null)
    assert.equal(result, null)
  })

  it('returns null and logs console.warn for unrecognized format: 12345 (D-13)', () => {
    const originalWarn = console.warn
    let warnCalled = false
    let warnMessage = ''
    console.warn = (msg) => {
      warnCalled = true
      warnMessage = msg
    }

    const result = normalizePhone('12345')

    console.warn = originalWarn

    assert.equal(result, null)
    assert.equal(warnCalled, true)
    assert.ok(warnMessage.includes('12345'), `warn message should include '12345', got: ${warnMessage}`)
  })

  it('returns null for empty string input', () => {
    const result = normalizePhone('')
    assert.equal(result, null)
  })
})
