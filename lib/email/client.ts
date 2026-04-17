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

export interface EmailAttachment {
  filename: string
  content: Buffer
  contentType: string
}

export async function sendEmail(options: {
  to: string
  subject: string
  html: string
  attachments?: EmailAttachment[]
}): Promise<boolean> {
  try {
    const transporter = getTransporter()
    const config = getConfig()

    await transporter.sendMail({
      from: config.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    })

    return true
  } catch (error) {
    console.error('Email sending error:', error)
    return false
  }
}
