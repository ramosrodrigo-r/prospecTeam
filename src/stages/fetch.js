import { searchPlaces } from '../services/places.js'
import { filterBusinesses } from '../utils/filter.js'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function fetchProspects({ city, category, apiKey, onSkip }) {
  const query = `${category} em ${city}`
  const results = []
  let pageToken = null

  do {
    if (pageToken) await sleep(2500)

    const data = await searchPlaces({ query, pageToken, apiKey })

    for (const place of (data.places ?? [])) {
      results.push({
        placeId: place.id,
        name: place.displayName?.text ?? null,
        rating: place.rating ?? null,
        phone: place.nationalPhoneNumber ?? null,
        website: place.websiteUri ?? null,
        email: null
      })
    }

    pageToken = data.nextPageToken ?? null
  } while (pageToken)

  return filterBusinesses(results, onSkip)
}
