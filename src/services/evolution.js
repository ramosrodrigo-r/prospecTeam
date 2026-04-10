export async function checkConnection({ baseUrl, apiKey }) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(
      `${baseUrl}/instance/status`,
      { headers: { apikey: apiKey }, signal: controller.signal }
    )
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Evolution Go error ${response.status}: ${err}`)
    }
    return response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function sendMediaMessage({ baseUrl, apiKey, number, mediatype, mimetype, media, fileName, caption }) {
  const response = await fetch(`${baseUrl}/send/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify({ number, mediatype, mimetype, media, fileName, caption: caption ?? '' })
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Evolution Go error ${response.status}: ${err}`)
  }
  return response.json()
}

export async function sendTextMessage({ baseUrl, apiKey, number, text }) {
  const response = await fetch(`${baseUrl}/send/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify({ number, text })
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Evolution Go error ${response.status}: ${err}`)
  }
  return response.json()
}
