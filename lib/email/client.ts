import nodemailer from 'nodemailer'
import { getConfig } from '@/lib/config'

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  if (!transporter) {
    const config = getConfig()

    transporter = nodemailer.createTransport({
      host: config.MAILTRAP_HOST,
      port: config.MAILTRAP_PORT,
      auth: {
        user: config.MAILTRAP_USER,
        pass: config.MAILTRAP_PASSWORD,
      },
    })
  }

  return transporter
}

export async function sendEmail(options: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  try {
    const transporter = getTransporter()
    const config = getConfig()

    await transporter.sendMail({
      from: config.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })

    return true
  } catch (error) {
    console.error('Email sending error:', error)
    return false
  }
}
