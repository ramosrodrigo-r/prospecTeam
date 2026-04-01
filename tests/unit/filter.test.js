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

  it('calls onSkip with prospect, reason, and URL when business has real website', () => {
    const skipped = []
    const onSkip = (prospect, reason, detail) => skipped.push({ prospect, reason, detail })
    const prospect = { website: 'https://real.com', name: 'Biz' }
    filterBusinesses([prospect], onSkip)
    assert.equal(skipped.length, 1)
    assert.equal(skipped[0].prospect, prospect)
    assert.equal(skipped[0].reason, 'has-website')
    assert.equal(skipped[0].detail, 'https://real.com')
  })

  it('does not call onSkip when business has no real website', () => {
    let callCount = 0
    const onSkip = () => callCount++
    filterBusinesses([{ website: null, name: 'Biz' }], onSkip)
    assert.equal(callCount, 0)
  })

  it('works without onSkip callback (backward compatible)', () => {
    const result = filterBusinesses([{ website: 'https://real.com' }, { website: null }])
    assert.equal(result.length, 1)
  })
})
