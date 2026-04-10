import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { parseArgs } from '../../src/utils/args.js'

describe('parseArgs', () => {
  let originalCity, originalCategory

  beforeEach(() => {
    originalCity = process.env.PROSPECT_CITY
    originalCategory = process.env.PROSPECT_CATEGORY
    delete process.env.PROSPECT_CITY
    delete process.env.PROSPECT_CATEGORY
  })

  afterEach(() => {
    if (originalCity === undefined) delete process.env.PROSPECT_CITY
    else process.env.PROSPECT_CITY = originalCity
    if (originalCategory === undefined) delete process.env.PROSPECT_CATEGORY
    else process.env.PROSPECT_CATEGORY = originalCategory
  })

  it('parses --city and --category correctly', () => {
    const result = parseArgs(['node', 'script', '--city', 'Campinas', '--category', 'academia'])
    assert.deepEqual(result, { city: 'Campinas', category: 'academia' })
  })

  it('parses --city and --category with spaces', () => {
    const result = parseArgs(['node', 'script', '--city', 'Sao Paulo', '--category', 'restaurante'])
    assert.deepEqual(result, { city: 'Sao Paulo', category: 'restaurante' })
  })

  it('usa PROSPECT_CITY do env quando --city nao e passado', () => {
    process.env.PROSPECT_CITY = 'Fortaleza'
    process.env.PROSPECT_CATEGORY = 'academia'
    const result = parseArgs(['node', 'script'])
    assert.equal(result.city, 'Fortaleza')
    assert.equal(result.category, 'academia')
  })

  it('CLI --city sobrescreve PROSPECT_CITY do env', () => {
    process.env.PROSPECT_CITY = 'Fortaleza'
    process.env.PROSPECT_CATEGORY = 'academia'
    const result = parseArgs(['node', 'script', '--city', 'Recife'])
    assert.equal(result.city, 'Recife')
  })

  it('lanca erro quando --city nao e passado e PROSPECT_CITY nao esta no env', () => {
    process.env.PROSPECT_CATEGORY = 'academia'
    assert.throws(
      () => parseArgs(['node', 'script']),
      (err) => {
        assert.ok(err.message.includes('PROSPECT_CITY'))
        return true
      }
    )
  })

  it('lanca erro quando --category nao e passado e PROSPECT_CATEGORY nao esta no env', () => {
    process.env.PROSPECT_CITY = 'Campinas'
    assert.throws(
      () => parseArgs(['node', 'script']),
      (err) => {
        assert.ok(err.message.includes('PROSPECT_CATEGORY'))
        return true
      }
    )
  })
})
