import nodemailer from 'nodemailer'

let transporter = null

export function createZohoTransporter({ user, pass, _createTransport }) {
  const createTransport = _createTransport ?? nodemailer.createTransport.bind(nodemailer)
  transporter = createTransport({
    host: 'smtp.zoho.com',
    port: 587,
    secure: false,  // STARTTLS for port 587, NOT SSL (per D-02)
    auth: { user, pass }
  })
}

export async function sendMail({ from, to, subject, text }) {
  return transporter.sendMail({ from, to, subject, text })
}
