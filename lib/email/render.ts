import { readFileSync } from 'fs'
import { join } from 'path'

const templateDir = join(process.cwd(), 'lib', 'email', 'html')
const templateCache = new Map<string, string>()

function loadTemplate(name: string): string {
  const cached = templateCache.get(name)
  if (cached) return cached

  const filePath = join(templateDir, `${name}.html`)
  const content = readFileSync(filePath, 'utf-8')
  templateCache.set(name, content)
  return content
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match
  )
}

export function renderEmail(
  templateName: string,
  vars: Record<string, string> & { subject: string; preheader?: string }
): string {
  const base = loadTemplate('base')
  const body = loadTemplate(templateName)

  const renderedBody = interpolate(body, vars)

  return interpolate(base, {
    ...vars,
    body: renderedBody,
    preheader: vars.preheader ?? vars.subject,
  })
}
