import { describe, expect, it, afterEach } from 'vitest'
import { renderEmail, clearTemplateCache } from '@/lib/email/render'

afterEach(() => {
  clearTemplateCache()
})

describe('renderEmail', () => {
  it('interpolates variables into content and layout', () => {
    const html = renderEmail('signature-request', {
      subject: 'Test Subject',
      preheader: 'Preview text',
      signerName: 'Jane',
      documentTitle: 'NDA',
      requesterName: 'John',
      signingUrl: 'https://example.com/sign/abc',
    })

    expect(html).toContain('Jane')
    expect(html).toContain('NDA')
    expect(html).toContain('John')
    expect(html).toContain('https://example.com/sign/abc')
    expect(html).toContain('Test Subject')
    expect(html).toContain('Preview text')
    expect(html).toContain('Lunar Sign')
  })

  it('preserves unmatched placeholders', () => {
    const html = renderEmail('document-completed-signer', {
      subject: 'Done',
      preheader: 'Done',
      signerName: 'Alice',
      documentTitle: 'Doc',
    })

    expect(html).toContain('Alice')
    expect(html).not.toContain('{{signerName}}')
  })

  it('caches templates on subsequent calls', () => {
    const html1 = renderEmail('document-completed-signer', {
      subject: 'A',
      preheader: 'A',
      signerName: 'X',
      documentTitle: 'Y',
    })
    const html2 = renderEmail('document-completed-signer', {
      subject: 'B',
      preheader: 'B',
      signerName: 'X2',
      documentTitle: 'Y2',
    })

    expect(html1).toContain('X')
    expect(html2).toContain('X2')
    expect(html2).toContain('B')
  })

  it('throws on missing template file', () => {
    expect(() =>
      renderEmail('nonexistent-template', { subject: 'x', preheader: 'x' })
    ).toThrow()
  })
})
