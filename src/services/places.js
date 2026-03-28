export async function searchPlaces({ query, pageToken = null, apiKey }) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.websiteUri,places.nationalPhoneNumber,places.rating,nextPageToken'
  }

  const body = { textQuery: query, pageSize: 20 }
  if (pageToken) body.pageToken = pageToken

  if (process.env.DEBUG === '1') {
    console.error('[DEBUG] Request headers:', JSON.stringify(headers, null, 2))
    console.error('[DEBUG] Request body:', JSON.stringify(body, null, 2))
  }

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Places API error ${response.status}: ${err}`)
  }

  return response.json()
}
