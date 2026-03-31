import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { sendEmail } from '../../src/stages/emailSender.js'

const prospect = { placeId: 'place123', name: 'Test Biz', email: 'test@biz.com' }
const message = 'Corpo do email de teste'
const subject = 'Assunto de teste'
const config = { user: 'from@zoho.com', pass: 'testpass' }

describe('sendEmail', () => {
  let recordSendCalls
  let mockSendMail
  let mockRecordSend
  let deps

  beforeEach(() => {
    recordSendCalls = []
    mockSendMail = async () => ({ messageId: 'test-id', accepted: ['test@biz.com'] })
    mockRecordSend = (placeId, channel) => { recordSendCalls.push({ placeId, channel }) }
    deps = { sendMail: mockSendMail, recordSend: mockRecordSend }
  })

  it('retorna { ok: true } quando prospect tem email e sendMail resolve', async () => {
    const result = await sendEmail(prospect, message, subject, config, deps)
    assert.deepStrictEqual(result, { ok: true })
  })

  it('chama recordSend(placeId, "email") apos envio SMTP bem-sucedido', async () => {
    await sendEmail(prospect, message, subject, config, deps)
    assert.equal(recordSendCalls.length, 1)
    assert.equal(recordSendCalls[0].placeId, prospect.placeId)
    assert.equal(recordSendCalls[0].channel, 'email')
  })

  it('retorna { ok: false, reason: "no email address" } quando prospect.email eh null', async () => {
    const prospectNoEmail = { placeId: 'place123', name: 'Test Biz', email: null }
    const result = await sendEmail(prospectNoEmail, message, subject, config, deps)
    assert.deepStrictEqual(result, { ok: false, reason: 'no email address' })
  })

  it('retorna { ok: false, reason: "no email address" } quando prospect.email eh undefined', async () => {
    const prospectNoEmail = { placeId: 'place123', name: 'Test Biz' }
    const result = await sendEmail(prospectNoEmail, message, subject, config, deps)
    assert.deepStrictEqual(result, { ok: false, reason: 'no email address' })
  })

  it('NAO chama sendMail quando prospect.email ausente', async () => {
    const sendMailCalls = []
    deps.sendMail = async () => { sendMailCalls.push(true); return {} }
    const prospectNoEmail = { placeId: 'place123', name: 'Test Biz', email: null }
    await sendEmail(prospectNoEmail, message, subject, config, deps)
    assert.equal(sendMailCalls.length, 0)
  })

  it('NAO chama recordSend quando prospect.email ausente', async () => {
    const prospectNoEmail = { placeId: 'place123', name: 'Test Biz', email: null }
    await sendEmail(prospectNoEmail, message, subject, config, deps)
    assert.equal(recordSendCalls.length, 0)
  })

  it('retorna { ok: false, reason } quando sendMail rejeita', async () => {
    deps.sendMail = async () => { throw new Error('SMTP error 535') }
    const result = await sendEmail(prospect, message, subject, config, deps)
    assert.equal(result.ok, false)
    assert.ok(typeof result.reason === 'string' && result.reason.length > 0)
    assert.ok(result.reason.includes('535'))
  })

  it('NAO chama recordSend quando sendMail rejeita', async () => {
    deps.sendMail = async () => { throw new Error('SMTP error') }
    await sendEmail(prospect, message, subject, config, deps)
    assert.equal(recordSendCalls.length, 0)
  })
})
