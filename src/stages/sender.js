import { sendTextMessage as _sendTextMessage, sendMediaMessage as _sendMediaMessage } from '../services/evolution.js'
import { recordSend as _recordSend } from '../history.js'

function getMimetype(filePath) {
  const ext = (filePath.split('.').pop() ?? '').toLowerCase()
  const map = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
  return map[ext] ?? 'application/octet-stream'
}

function getMediatype(mimetype) {
  if (mimetype.startsWith('image/')) return 'image'
  if (mimetype.startsWith('video/')) return 'video'
  return 'document'
}

export async function sendWhatsAppMedia(prospect, { buffer, filePath, fileName }, config, _deps = {}) {
  const sendMediaMessage = _deps.sendMediaMessage ?? _sendMediaMessage
  const mimetype = getMimetype(filePath)
  const mediatype = getMediatype(mimetype)
  const media = buffer.toString('base64')

  try {
    await sendMediaMessage({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      number: prospect.phone,
      mediatype,
      mimetype,
      media,
      fileName: fileName ?? 'arquivo',
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: err.message }
  }
}

export async function sendWhatsApp(prospect, message, config, _deps = {}) {
  // config = { baseUrl, apiKey, instance }
  // _deps allows dependency injection for testing: { sendTextMessage, recordSend }
  const sendTextMessage = _deps.sendTextMessage ?? _sendTextMessage
  const recordSend = _deps.recordSend ?? _recordSend

  try {
    await sendTextMessage({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
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
