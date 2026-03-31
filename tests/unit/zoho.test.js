import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createZohoTransporter, sendMail } from '../../src/services/zoho.js'

describe('zoho', () => {
  it('createZohoTransporter cria transporter com smtp.zoho.com:587 secure false', () => {
    let capturedConfig = null
    const mockCreateTransport = (config) => {
      capturedConfig = config
      return { sendMail: async () => ({}) }
    }

    createZohoTransporter({ user: 'user@test.com', pass: 'testpass', _createTransport: mockCreateTransport })

    assert.equal(capturedConfig.host, 'smtp.zoho.com')
    assert.equal(capturedConfig.port, 587)
    assert.equal(capturedConfig.secure, false)
    assert.equal(capturedConfig.auth.user, 'user@test.com')
    assert.equal(capturedConfig.auth.pass, 'testpass')
  })

  it('sendMail chama transporter.sendMail com from/to/subject/text', async () => {
    const sendMailCalls = []
    const mockCreateTransport = () => ({
      sendMail: async (args) => { sendMailCalls.push(args); return { messageId: 'test-id' } }
    })

    createZohoTransporter({ user: 'from@test.com', pass: 'pass', _createTransport: mockCreateTransport })
    await sendMail({ from: 'from@test.com', to: 'to@test.com', subject: 'Test subject', text: 'Hello' })

    assert.equal(sendMailCalls.length, 1)
    assert.equal(sendMailCalls[0].from, 'from@test.com')
    assert.equal(sendMailCalls[0].to, 'to@test.com')
    assert.equal(sendMailCalls[0].subject, 'Test subject')
    assert.equal(sendMailCalls[0].text, 'Hello')
  })
})
