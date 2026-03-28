import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseArgs } from '../../src/utils/args.js'

describe('parseArgs', () => {
  it('parses --city and --category correctly', () => {
    const result = parseArgs(['node', 'script', '--city', 'Sao Paulo', '--category', 'restaurante'])
    assert.deepEqual(result, { city: 'Sao Paulo', category: 'restaurante' })
  })

  it('returns object without category when --category is omitted', () => {
    const result = parseArgs(['node', 'script', '--city', 'Sao Paulo'])
    assert.equal(result.city, 'Sao Paulo')
    assert.equal(result.category, undefined)
  })

  it('returns object with neither city nor category when no args given', () => {
    const result = parseArgs(['node', 'script'])
    assert.equal(result.city, undefined)
    assert.equal(result.category, undefined)
  })

  it('treats next flag as value when arg value is another flag', () => {
    const result = parseArgs(['node', 'script', '--city', '--category', 'restaurante'])
    // Current value of city would be '--category' (consumed as value)
    assert.equal(result.city, '--category')
    assert.equal(result.category, 'restaurante')
  })
})
