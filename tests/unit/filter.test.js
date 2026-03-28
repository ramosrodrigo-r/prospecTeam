import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { filterBusinesses } from '../../src/utils/filter.js'

describe('filterBusinesses', () => {
  it('includes business with null website', () => {
    const result = filterBusinesses([{ website: null }])
    assert.equal(result.length, 1)
  })

  it('includes business with empty string website', () => {
    const result = filterBusinesses([{ website: '' }])
    assert.equal(result.length, 1)
  })

  it('includes business with whitespace-only website', () => {
    const result = filterBusinesses([{ website: '   ' }])
    assert.equal(result.length, 1)
  })

  it('includes business with protocol-less Instagram URL (no-protocol Instagram, D-03)', () => {
    const result = filterBusinesses([{ website: 'instagram.com/business' }])
    assert.equal(result.length, 1)
  })

  it('includes business with https Instagram URL including subdomain (D-02)', () => {
    const result = filterBusinesses([{ website: 'https://www.instagram.com/business' }])
    assert.equal(result.length, 1)
  })

  it('includes business with linktr.ee URL (D-01)', () => {
    const result = filterBusinesses([{ website: 'https://linktr.ee/business' }])
    assert.equal(result.length, 1)
  })

  it('excludes business with a real website', () => {
    const result = filterBusinesses([{ website: 'https://minhapadaria.com.br' }])
    assert.equal(result.length, 0)
  })

  it('includes business with unparseable URL (parse failure = no site, D-05)', () => {
    const result = filterBusinesses([{ website: '://invalid' }])
    assert.equal(result.length, 1)
  })
})
