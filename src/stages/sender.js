import { sendTextMessage as _sendTextMessage } from '../services/evolution.js'
import { recordSend as _recordSend } from '../history.js'

export async function sendWhatsApp(prospect, message, config, _deps = {}) {
  // config = { baseUrl, apiKey, instance }
  // _deps allows dependency injection for testing: { sendTextMessage, recordSend }
  const sendTextMessage = _deps.sendTextMessage ?? _sendTextMessage
  const recordSend = _deps.recordSend ?? _recordSend

  try {
    await sendTextMessage({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      instance: config.instance,
      number: prospect.phone,
      text: message
    })
    recordSend(prospect.placeId, 'wa')
    // Delay 3-8 seconds after send (per D-12, WA-02)
    const delay = 3000 + Math.floor(Math.random() * 5001)
    await new Promise(resolve => setTimeout(resolve, delay))
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: err.message }
  }
}
