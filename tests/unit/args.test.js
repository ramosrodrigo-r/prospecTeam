import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseArgs } from '../../src/utils/args.js'

describe('parseArgs', () => {
  it('parses --city and --category correctly', () => {
    const result = parseArgs(['node', 'script', '--city', 'Campinas', '--category', 'academia'])
    assert.deepEqual(result, { city: 'Campinas', category: 'academia' })
  })

  it('parses --city and --category with spaces', () => {
    const result = parseArgs(['node', 'script', '--city', 'Sao Paulo', '--category', 'restaurante'])
    assert.deepEqual(result, { city: 'Sao Paulo', category: 'restaurante' })
  })

  it('throws CommanderError when --city is missing', () => {
    assert.throws(
      () => parseArgs(['node', 'script', '--category', 'academia']),
      (err) => {
        assert.ok(err.code === 'commander.missingMandatoryOptionValue' || err.code === 'commander.missingRequiredOption' || err.constructor.name === 'CommanderError')
        return true
      }
    )
  })

  it('throws CommanderError when --category is missing', () => {
    assert.throws(
      () => parseArgs(['node', 'script', '--city', 'Campinas']),
      (err) => {
        assert.ok(err.code === 'commander.missingMandatoryOptionValue' || err.code === 'commander.missingRequiredOption' || err.constructor.name === 'CommanderError')
        return true
      }
    )
  })

  it('throws CommanderError when no args given', () => {
    assert.throws(
      () => parseArgs(['node', 'script']),
      (err) => {
        assert.ok(err.constructor.name === 'CommanderError')
        return true
      }
    )
  })
})
