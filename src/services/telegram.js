const BASE = 'https://api.telegram.org'

export async function sendMessage(token, chatId, text, replyMarkup) {
  const body = { chat_id: chatId, text, parse_mode: 'Markdown' }
  if (replyMarkup) body.reply_markup = replyMarkup
  const res = await fetch(`${BASE}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Telegram sendMessage error: ${data.description}`)
  return data.result
}

async function answerCallbackQuery(token, callbackQueryId) {
  await fetch(`${BASE}/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId })
  })
}

// Initializes offset to ignore old updates. Call once before the interaction loop.
export async function initUpdatesOffset(token) {
  const res = await fetch(`${BASE}/bot${token}/getUpdates?offset=-1&timeout=0`)
  const data = await res.json()
  if (data.ok && data.result.length > 0) {
    return data.result[data.result.length - 1].update_id + 1
  }
  return 0
}

// Downloads a file from Telegram by file_id. Returns { buffer, filePath }.
export async function downloadTelegramFile(token, fileId) {
  const res = await fetch(`${BASE}/bot${token}/getFile?file_id=${fileId}`)
  const data = await res.json()
  if (!data.ok) throw new Error(`Telegram getFile error: ${data.description}`)
  const filePath = data.result.file_path
  const fileRes = await fetch(`${BASE}/file/bot${token}/${filePath}`)
  if (!fileRes.ok) throw new Error('Falha ao baixar arquivo do Telegram')
  const buffer = Buffer.from(await fileRes.arrayBuffer())
  return { buffer, filePath }
}

// Waits for the user to send a media file (photo, video or document).
// Returns { type, fileId, fileName, nextOffset }
export async function waitForMedia(token, chatId, offset, timeoutMs = 5 * 60 * 1000) {
  const deadline = Date.now() + timeoutMs
  let currentOffset = offset

  while (Date.now() < deadline) {
    const remaining = Math.min(30, Math.floor((deadline - Date.now()) / 1000))
    if (remaining <= 0) break

    const res = await fetch(
      `${BASE}/bot${token}/getUpdates?offset=${currentOffset}&timeout=${remaining}&allowed_updates=["message"]`
    )
    const data = await res.json()
    if (!data.ok) continue

    for (const update of data.result) {
      currentOffset = update.update_id + 1
      const msg = update.message
      if (!msg) continue
      if (String(msg.chat?.id) !== String(chatId)) continue

      if (msg.photo) {
        const photo = msg.photo[msg.photo.length - 1]
        return { type: 'image', fileId: photo.file_id, fileName: 'imagem.jpg', nextOffset: currentOffset }
      }
      if (msg.video) {
        return { type: 'video', fileId: msg.video.file_id, fileName: msg.video.file_name ?? 'video.mp4', nextOffset: currentOffset }
      }
      if (msg.document) {
        return { type: 'document', fileId: msg.document.file_id, fileName: msg.document.file_name ?? 'arquivo', nextOffset: currentOffset }
      }
    }
  }

  throw new Error('Timeout: nenhum arquivo recebido no Telegram em 5 minutos.')
}

// Waits for the user to send a text message. Returns { text, nextOffset }.
export async function waitForTextReply(token, chatId, offset, timeoutMs = 5 * 60 * 1000) {
  const deadline = Date.now() + timeoutMs
  let currentOffset = offset

  while (Date.now() < deadline) {
    const remaining = Math.min(30, Math.floor((deadline - Date.now()) / 1000))
    if (remaining <= 0) break

    const res = await fetch(
      `${BASE}/bot${token}/getUpdates?offset=${currentOffset}&timeout=${remaining}&allowed_updates=["message"]`
    )
    const data = await res.json()
    if (!data.ok) continue

    for (const update of data.result) {
      currentOffset = update.update_id + 1
      const msg = update.message
      if (!msg?.text) continue
      if (String(msg.chat?.id) !== String(chatId)) continue

      return { text: msg.text.trim(), nextOffset: currentOffset }
    }
  }

  throw new Error('Timeout: nenhuma resposta recebida no Telegram em 5 minutos.')
}

// Waits for the user to click approve or cancel on a specific message.
// Returns { decision: 'approve'|'cancel', nextOffset }
export async function waitForApproval(token, chatId, sentMessageId, offset, timeoutMs = 5 * 60 * 1000) {
  const deadline = Date.now() + timeoutMs
  let currentOffset = offset

  while (Date.now() < deadline) {
    const remaining = Math.min(30, Math.floor((deadline - Date.now()) / 1000))
    if (remaining <= 0) break

    const res = await fetch(
      `${BASE}/bot${token}/getUpdates?offset=${currentOffset}&timeout=${remaining}&allowed_updates=["callback_query"]`
    )
    const data = await res.json()
    if (!data.ok) continue

    for (const update of data.result) {
      currentOffset = update.update_id + 1
      const cq = update.callback_query
      if (!cq) continue
      if (String(cq.message?.chat?.id) !== String(chatId)) continue
      if (cq.message?.message_id !== sentMessageId) continue

      await answerCallbackQuery(token, cq.id)
      return { decision: cq.data, nextOffset: currentOffset }
    }
  }

  throw new Error('Timeout: nenhuma resposta recebida no Telegram em 5 minutos.')
}
