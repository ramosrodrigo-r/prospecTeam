import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fetchProspects } from '../../src/stages/fetch.js'

describe('fetchProspects', () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns mapped prospects from a single-page response (no nextPageToken)', async () => {
    const mockResponse = {
      places: [
        {
          id: 'place1',
          displayName: { text: 'Padaria', languageCode: 'pt' },
          rating: 4.5,
          nationalPhoneNumber: '(11) 98765-4321',
          websiteUri: null
        }
      ]
    }

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => mockResponse
    })

    const result = await fetchProspects({ city: 'Sao Paulo', category: 'padaria', apiKey: 'KEY' })
    assert.deepEqual(result, [
      {
        placeId: 'place1',
        name: 'Padaria',
        rating: 4.5,
        phone: '(11) 98765-4321',
        website: null,
        email: null
      }
    ])
  })

  it('paginates when nextPageToken is present, returning combined results', async () => {
    const firstResponse = {
      places: [
        {
          id: 'place1',
          displayName: { text: 'Padaria A', languageCode: 'pt' },
          rating: 4.0,
          nationalPhoneNumber: null,
          websiteUri: null
        }
      ],
      nextPageToken: 'TOKEN_ABC'
    }

    const secondResponse = {
      places: [
        {
          id: 'place2',
          displayName: { text: 'Padaria B', languageCode: 'pt' },
          rating: 4.2,
          nationalPhoneNumber: '(21) 91234-5678',
          websiteUri: 'https://www.instagram.com/padariaB'
        }
      ]
    }

    let callCount = 0
    let secondCallBody = null

    globalThis.fetch = async (url, opts) => {
      callCount++
      if (callCount === 1) {
        return { ok: true, json: async () => firstResponse }
      }
      secondCallBody = JSON.parse(opts.body)
      return { ok: true, json: async () => secondResponse }
    }

    const result = await fetchProspects({ city: 'Sao Paulo', category: 'padaria', apiKey: 'KEY' })

    assert.equal(result.length, 2)
    assert.equal(callCount, 2)
    assert.equal(secondCallBody.pageToken, 'TOKEN_ABC')
  })

  it('maps missing fields to null', async () => {
    const mockResponse = {
      places: [
        {
          id: 'place3',
          displayName: { text: 'Loja Sem Info', languageCode: 'pt' }
        }
      ]
    }

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => mockResponse
    })

    const result = await fetchProspects({ city: 'Curitiba', category: 'loja', apiKey: 'KEY' })
    assert.deepEqual(result, [
      {
        placeId: 'place3',
        name: 'Loja Sem Info',
        rating: null,
        phone: null,
        website: null,
        email: null
      }
    ])
  })

  it('extracts displayName.text (not the object itself)', async () => {
    const mockResponse = {
      places: [
        {
          id: 'place4',
          displayName: { text: 'Test Name', languageCode: 'en' }
        }
      ]
    }

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => mockResponse
    })

    const result = await fetchProspects({ city: 'Rio', category: 'cafe', apiKey: 'KEY' })
    assert.equal(result[0].name, 'Test Name')
    assert.notEqual(typeof result[0].name, 'object')
  })

  it('email is always null', async () => {
    const mockResponse = {
      places: [
        {
          id: 'place5',
          displayName: { text: 'Empresa', languageCode: 'pt' }
        }
      ]
    }

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => mockResponse
    })

    const result = await fetchProspects({ city: 'SP', category: 'empresa', apiKey: 'KEY' })
    assert.equal(result[0].email, null)
  })
})
