/**
 * ESIGN Act / UETA consumer disclosure text.
 *
 * This text is hashed at consent time and stored in
 * signature_requests.consent_text_hash. If the copy changes, bump
 * CONSENT_TEXT_VERSION in the environment — the hash will differ and
 * historical consent records remain verifiable.
 *
 * Derived from: 15 U.S.C. § 7001(c) (ESIGN) and UETA § 8.
 */

export const CONSENT_HEADING = 'Electronic Signature Disclosure and Consent'

export const CONSENT_PARAGRAPHS = [
  'By proceeding, you consent to conduct this transaction electronically and to sign this document using an electronic signature, in accordance with the U.S. Electronic Signatures in Global and National Commerce Act (ESIGN) and the Uniform Electronic Transactions Act (UETA).',

  'Your electronic signature has the same legal effect as a handwritten signature. You are adopting the signature you create below as your legal signature and you agree to be legally bound by this document.',

  'You have the right to request a paper copy of this document. To request a paper copy or withdraw your consent to electronic records, contact the document sender. Withdrawal of consent does not affect the legal validity of signatures already provided.',

  'System requirements: a modern web browser (Chrome, Firefox, Safari, or Edge) with JavaScript enabled and the ability to view PDF documents.',

  'Lunar Sign will retain signed documents and the associated audit record. A copy of the signed document will be emailed to you upon completion.',

  'If you do not consent to using electronic signatures, click "Decline" on the signing page.',
]

export const CONSENT_TEXT = CONSENT_PARAGRAPHS.join('\n\n')
