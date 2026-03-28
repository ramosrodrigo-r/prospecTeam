import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { searchPlaces } from '../../src/services/places.js'

describe('searchPlaces', () => {
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
        json: async () => ({ places: [] })
      }
    }
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    delete process.env.DEBUG
  })

  it('sends correct X-Goog-FieldMask header', async () => {
    await searchPlaces({ query: 'test', apiKey: 'KEY123' })
    const headers = capturedOpts.headers
    assert.equal(
      headers['X-Goog-FieldMask'],
      'places.id,places.displayName,places.websiteUri,places.nationalPhoneNumber,places.rating,nextPageToken'
    )
  })

  it('sends X-Goog-Api-Key header with the provided apiKey', async () => {
    await searchPlaces({ query: 'test', apiKey: 'KEY123' })
    assert.equal(capturedOpts.headers['X-Goog-Api-Key'], 'KEY123')
  })

  it('sends POST to the correct Places API URL', async () => {
    await searchPlaces({ query: 'test', apiKey: 'KEY123' })
    assert.equal(capturedUrl, 'https://places.googleapis.com/v1/places:searchText')
    assert.equal(capturedOpts.method, 'POST')
  })

  it('sends textQuery and pageSize in request body', async () => {
    await searchPlaces({ query: 'restaurante em Sao Paulo', apiKey: 'KEY123' })
    const body = JSON.parse(capturedOpts.body)
    assert.equal(body.textQuery, 'restaurante em Sao Paulo')
    assert.equal(body.pageSize, 20)
  })

  it('includes pageToken in body when provided', async () => {
    await searchPlaces({ query: 'test', apiKey: 'KEY123', pageToken: 'TOKEN_XYZ' })
    const body = JSON.parse(capturedOpts.body)
    assert.equal(body.pageToken, 'TOKEN_XYZ')
  })

  it('does NOT include pageToken in body when not provided', async () => {
    await searchPlaces({ query: 'test', apiKey: 'KEY123' })
    const body = JSON.parse(capturedOpts.body)
    assert.equal(Object.prototype.hasOwnProperty.call(body, 'pageToken'), false)
  })

  it('calls console.error when DEBUG=1', async () => {
    process.env.DEBUG = '1'
    let errorCalled = false
    const originalError = console.error
    console.error = (...args) => { errorCalled = true }
    try {
      await searchPlaces({ query: 'test', apiKey: 'KEY123' })
      assert.ok(errorCalled, 'console.error should have been called with DEBUG=1')
    } finally {
      console.error = originalError
    }
  })

  it('does NOT call console.error when DEBUG is unset', async () => {
    delete process.env.DEBUG
    let errorCalled = false
    const originalError = console.error
    console.error = (...args) => { errorCalled = true }
    try {
      await searchPlaces({ query: 'test', apiKey: 'KEY123' })
      assert.equal(errorCalled, false, 'console.error should NOT have been called without DEBUG')
    } finally {
      console.error = originalError
    }
  })
})
