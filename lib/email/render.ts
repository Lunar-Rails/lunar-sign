import { readFileSync } from 'fs'
import { join } from 'path'

const TEMPLATES_DIR = join(process.cwd(), 'lib', 'email', 'templates')

const fileCache = new Map<string, string>()

function readTemplate(filename: string): string {
  const cached = fileCache.get(filename)
  if (cached) return cached

  const filepath = join(TEMPLATES_DIR, filename)
  const content = readFileSync(filepath, 'utf-8')
  fileCache.set(filename, content)
  return content
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match
  })
}

export function renderEmail(
  templateName: string,
  vars: Record<string, string> & { subject: string; preheader?: string }
): string {
  const layout = readTemplate('layout.html')
  const content = readTemplate(`${templateName}.html`)

  const renderedContent = interpolate(content, vars)
  return interpolate(layout, {
    ...vars,
    preheader: vars.preheader ?? vars.subject,
    content: renderedContent,
  })
}

export function clearTemplateCache(): void {
  fileCache.clear()
}
