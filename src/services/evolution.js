export async function checkConnection({ baseUrl, apiKey, instance }) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(
      `${baseUrl}/instance/connectionState/${instance}`,
      { headers: { apikey: apiKey }, signal: controller.signal }
    )
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Evolution API error ${response.status}: ${err}`)
    }
    return response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function sendTextMessage({ baseUrl, apiKey, instance, number, text }) {
  const response = await fetch(`${baseUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify({ number, text })
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Evolution API error ${response.status}: ${err}`)
  }
  return response.json()
}
