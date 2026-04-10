import 'dotenv/config'
import { validateEnv } from '../src/utils/env.js'
import { checkConnection } from '../src/services/evolution.js'
import { sendMessage, waitForTextReply, waitForApproval, waitForMedia, downloadTelegramFile, initUpdatesOffset } from '../src/services/telegram.js'
import { fetchProspects } from '../src/stages/fetch.js'
import { loadHistory, isDuplicate } from '../src/history.js'
import { dedupProspects } from '../src/stages/dedup.js'
import { renderMessage } from '../src/stages/render.js'
import { sendWhatsApp, sendWhatsAppMedia } from '../src/stages/sender.js'

const BATCH_SIZE = 10

// 1. Validate environment
let env
try {
  env = validateEnv()
} catch (err) {
  console.error(`Error: ${err.message}`)
  process.exit(1)
}

// 2. Health check Evolution Go instance
try {
  const status = await checkConnection({
    baseUrl: env.evolutionApiUrl,
    apiKey: env.evolutionApiKey
  })
  if (!status.data?.Connected || !status.data?.LoggedIn) {
    console.error('Error: Evolution Go instance not connected. Reconnect via QR code before running.')
    process.exit(1)
  }
} catch (err) {
  console.error('Error: Evolution Go instance not connected. Reconnect via QR code before running.')
  process.exit(1)
}

// 3. Main prospecting loop
let offset = await initUpdatesOffset(env.telegramBotToken)

const waConfig = {
  baseUrl: env.evolutionApiUrl,
  apiKey: env.evolutionApiKey
}

await sendMessage(env.telegramBotToken, env.telegramChatId, '👋 ProspecTeam iniciado!\n\n📍 Qual *cidade* deseja prospectar?')

while (true) {
  // --- Ask city ---
  let city
  try {
    const reply = await waitForTextReply(env.telegramBotToken, env.telegramChatId, offset)
    city = reply.text
    offset = reply.nextOffset
  } catch (err) {
    console.error(`Timeout aguardando cidade: ${err.message}`)
    process.exit(1)
  }

  await sendMessage(env.telegramBotToken, env.telegramChatId, `✅ Cidade: *${city}*\n\n🏷️ Qual *nicho* deseja prospectar?`)

  // --- Ask category ---
  let category
  try {
    const reply = await waitForTextReply(env.telegramBotToken, env.telegramChatId, offset)
    category = reply.text
    offset = reply.nextOffset
  } catch (err) {
    console.error(`Timeout aguardando nicho: ${err.message}`)
    process.exit(1)
  }

  await sendMessage(env.telegramBotToken, env.telegramChatId, `✅ Nicho: *${category}*\n\n🔍 Buscando prospects...`)
  console.log(`Cidade: ${city} | Nicho: ${category}`)

  // 4. Fetch prospects
  let prospects
  try {
    prospects = await fetchProspects({
      city, category, apiKey: env.apiKey,
      onSkip: (prospect, reason, url) => {
        console.log(`[SKIP ${reason}: ${url}] ${prospect.name}`)
      }
    })
  } catch (err) {
    console.error(`Error fetching prospects: ${err.message}`)
    await sendMessage(env.telegramBotToken, env.telegramChatId, `❌ Erro ao buscar prospects: ${err.message}`)
    process.exit(1)
  }

  // 5. Load history and dedup
  loadHistory()
  prospects = dedupProspects(prospects, (prospect, reason, channels) => {
    console.log(`[SKIP ${reason}: ${channels.join('+')}] ${prospect.name}`)
  })

  prospects = prospects.slice(0, BATCH_SIZE)

  if (prospects.length === 0) {
    await sendMessage(env.telegramBotToken, env.telegramChatId, '⚠️ Nenhum prospect novo encontrado.')
  } else {
    await sendMessage(
      env.telegramBotToken,
      env.telegramChatId,
      `📋 *${prospects.length} prospects encontrados.* Revisando um a um...`
    )

    // 6. Per-prospect approval loop
    let sent = 0
    let skipped = 0

    for (const prospect of prospects) {
      if (!prospect.phone) {
        console.log(`[SKIP wa: no-phone] ${prospect.name}`)
        await sendMessage(env.telegramBotToken, env.telegramChatId, `⚠️ *${prospect.name}* — sem telefone, pulando.`)
        skipped++
        continue
      }

      if (isDuplicate(prospect.placeId, 'wa')) {
        skipped++
        continue
      }

      let waMessage = renderMessage(prospect, { cidade: city, categoria: category })
      const phone = prospect.phone ?? '—'
      const rating = prospect.rating ? `⭐ ${prospect.rating}` : ''

      // --- Approval loop (supports editing) ---
      let sendApproved = false
      while (true) {
        const preview = [
          `👤 *${prospect.name}*`,
          `☎️ ${phone}  ${rating}`.trim(),
          '',
          `📨 *Mensagem a ser enviada:*`,
          `\`\`\``,
          waMessage,
          `\`\`\``
        ].join('\n')

        let approvalMsg
        try {
          approvalMsg = await sendMessage(
            env.telegramBotToken,
            env.telegramChatId,
            preview,
            {
              inline_keyboard: [[
                { text: '✅ Enviar', callback_data: 'approve' },
                { text: '✏️ Editar', callback_data: 'edit' },
                { text: '❌ Pular', callback_data: 'cancel' }
              ]]
            }
          )
        } catch (err) {
          console.error(`Erro ao enviar preview no Telegram: ${err.message}`)
          break
        }

        let decision
        try {
          const result = await waitForApproval(env.telegramBotToken, env.telegramChatId, approvalMsg.message_id, offset)
          decision = result.decision
          offset = result.nextOffset
        } catch (err) {
          console.error(`Timeout aguardando resposta: ${err.message}`)
          await sendMessage(env.telegramBotToken, env.telegramChatId, '⏱️ Timeout — encerrando sessão.')
          process.exit(1)
        }

        if (decision === 'cancel') {
          console.log(`[SKIP manual] ${prospect.name}`)
          skipped++
          break
        }

        if (decision === 'edit') {
          await sendMessage(env.telegramBotToken, env.telegramChatId, '✏️ Envie o novo texto da mensagem:')
          try {
            const textReply = await waitForTextReply(env.telegramBotToken, env.telegramChatId, offset)
            waMessage = textReply.text
            offset = textReply.nextOffset
          } catch (err) {
            await sendMessage(env.telegramBotToken, env.telegramChatId, '⏱️ Timeout — encerrando sessão.')
            process.exit(1)
          }
          continue
        }

        // decision === 'approve'
        sendApproved = true
        break
      }

      if (!sendApproved) continue

      // --- Attachment flow ---
      let mediaData = null
      let attachMsg
      try {
        attachMsg = await sendMessage(
          env.telegramBotToken,
          env.telegramChatId,
          '📎 Deseja enviar um anexo junto com a mensagem?',
          {
            inline_keyboard: [[
              { text: '📹 Vídeo', callback_data: 'attach_video' },
              { text: '🖼️ Imagem', callback_data: 'attach_image' },
              { text: '📄 Documento', callback_data: 'attach_document' },
              { text: '❌ Não', callback_data: 'attach_none' }
            ]]
          }
        )
      } catch (err) {
        console.error(`Erro ao enviar pergunta de anexo: ${err.message}`)
      }

      if (attachMsg) {
        try {
          const attachResult = await waitForApproval(env.telegramBotToken, env.telegramChatId, attachMsg.message_id, offset)
          offset = attachResult.nextOffset

          if (attachResult.decision !== 'attach_none') {
            await sendMessage(env.telegramBotToken, env.telegramChatId, '📤 Envie o arquivo agora:')
            const mediaReply = await waitForMedia(env.telegramBotToken, env.telegramChatId, offset)
            offset = mediaReply.nextOffset
            const { buffer, filePath } = await downloadTelegramFile(env.telegramBotToken, mediaReply.fileId)
            mediaData = { buffer, filePath, fileName: mediaReply.fileName }
          }
        } catch (err) {
          await sendMessage(env.telegramBotToken, env.telegramChatId, `⚠️ Nenhum arquivo recebido, enviando só o texto.`)
        }
      }

      // --- Send ---
      const result = await sendWhatsApp(prospect, waMessage, waConfig)
      if (result.ok) {
        console.log(`[WA sent] ${prospect.name}`)
        await sendMessage(env.telegramBotToken, env.telegramChatId, `✅ Mensagem enviada para *${prospect.name}*`)
        sent++

        if (mediaData) {
          const mediaResult = await sendWhatsAppMedia(prospect, mediaData, waConfig)
          if (mediaResult.ok) {
            await sendMessage(env.telegramBotToken, env.telegramChatId, `📎 Anexo enviado para *${prospect.name}*`)
          } else {
            await sendMessage(env.telegramBotToken, env.telegramChatId, `⚠️ Texto enviado, mas falha no anexo: ${mediaResult.reason}`)
          }
        }
      } else {
        console.log(`[WA failed: ${result.reason}] ${prospect.name}`)
        await sendMessage(env.telegramBotToken, env.telegramChatId, `❌ Falha ao enviar para *${prospect.name}*: ${result.reason}`)
      }
    }

    // 7. Summary
    const summary = `📊 *Sessão concluída*\n✅ Enviados: ${sent}\n⏭️ Pulados: ${skipped}`
    await sendMessage(env.telegramBotToken, env.telegramChatId, summary)
    console.log(`\nConcluído — enviados: ${sent}, pulados: ${skipped}`)
  }

  // 8. Ask if user wants another prospecting session
  let newSessionMsg
  try {
    newSessionMsg = await sendMessage(
      env.telegramBotToken,
      env.telegramChatId,
      '🔄 Deseja iniciar uma nova prospecção?',
      {
        inline_keyboard: [[
          { text: '✅ Sim', callback_data: 'new_session_yes' },
          { text: '❌ Não', callback_data: 'new_session_no' }
        ]]
      }
    )
  } catch (err) {
    console.error(`Erro ao perguntar nova sessão: ${err.message}`)
    process.exit(0)
  }

  let newSessionDecision
  try {
    const result = await waitForApproval(env.telegramBotToken, env.telegramChatId, newSessionMsg.message_id, offset, 10 * 60 * 1000)
    newSessionDecision = result.decision
    offset = result.nextOffset
  } catch (err) {
    await sendMessage(env.telegramBotToken, env.telegramChatId, '⏱️ Tempo esgotado — encerrando. Até logo!')
    process.exit(0)
  }

  if (newSessionDecision === 'new_session_no') {
    await sendMessage(env.telegramBotToken, env.telegramChatId, '👋 Até logo!')
    console.log('Usuário encerrou o bot.')
    process.exit(0)
  }

  // User said yes — ask for city again at the top of the loop
  await sendMessage(env.telegramBotToken, env.telegramChatId, '📍 Qual *cidade* deseja prospectar?')
}
