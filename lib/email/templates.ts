export function signatureRequestEmail(params: {
  signerName: string
  documentTitle: string
  requesterName: string
  signingUrl: string
}): { subject: string; html: string } {
  const subject = `Please sign: ${params.documentTitle}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #1a202c;
      margin: 0;
      font-size: 24px;
    }
    .content {
      margin: 20px 0;
    }
    .content p {
      margin: 10px 0;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: white;
      padding: 12px 24px;
      border-radius: 5px;
      text-decoration: none;
      font-weight: bold;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .footer {
      border-top: 1px solid #e0e0e0;
      padding-top: 20px;
      margin-top: 30px;
      color: #666;
      font-size: 12px;
      text-align: center;
    }
    .document-info {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Lunar Sign</h1>
    </div>

    <div class="content">
      <p>Hello ${params.signerName},</p>

      <p>${params.requesterName} has requested your signature on the following document:</p>

      <div class="document-info">
        <strong>Document:</strong> ${params.documentTitle}
      </div>

      <p>Please click the button below to review and sign the document:</p>

      <a href="${params.signingUrl}" class="button">Sign Document</a>

      <p>This link is unique to you and can only be used once. If you have any questions or concerns, please contact ${params.requesterName}.</p>
    </div>

    <div class="footer">
      <p>Lunar Sign - Lunar Rails</p>
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `

  return { subject, html }
}

export function documentSignedEmail(params: {
  ownerName: string
  documentTitle: string
  signerName: string
  documentUrl: string
}): { subject: string; html: string } {
  const subject = `Signature Received: ${params.documentTitle}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #1a202c;
      margin: 0;
      font-size: 24px;
    }
    .content {
      margin: 20px 0;
    }
    .content p {
      margin: 10px 0;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: white;
      padding: 12px 24px;
      border-radius: 5px;
      text-decoration: none;
      font-weight: bold;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .footer {
      border-top: 1px solid #e0e0e0;
      padding-top: 20px;
      margin-top: 30px;
      color: #666;
      font-size: 12px;
      text-align: center;
    }
    .signer-info {
      background-color: #f0fdf4;
      padding: 15px;
      border-left: 4px solid #22c55e;
      border-radius: 5px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Lunar Sign</h1>
    </div>

    <div class="content">
      <p>Hello ${params.ownerName},</p>

      <p>${params.signerName} has signed your document.</p>

      <div class="signer-info">
        <strong>Document:</strong> ${params.documentTitle}<br>
        <strong>Signed by:</strong> ${params.signerName}
      </div>

      <p>
        <a href="${params.documentUrl}" class="button">View Document</a>
      </p>
    </div>

    <div class="footer">
      <p>Lunar Sign - Lunar Rails</p>
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `

  return { subject, html }
}

export function allPartiesSignedEmail(params: {
  recipientName: string
  documentTitle: string
  downloadUrl: string
}): { subject: string; html: string } {
  const subject = `All Signatures Complete: ${params.documentTitle}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #1a202c;
      margin: 0;
      font-size: 24px;
    }
    .content {
      margin: 20px 0;
    }
    .content p {
      margin: 10px 0;
    }
    .button {
      display: inline-block;
      background-color: #22c55e;
      color: white;
      padding: 12px 24px;
      border-radius: 5px;
      text-decoration: none;
      font-weight: bold;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #16a34a;
    }
    .footer {
      border-top: 1px solid #e0e0e0;
      padding-top: 20px;
      margin-top: 30px;
      color: #666;
      font-size: 12px;
      text-align: center;
    }
    .completion-info {
      background-color: #f0fdf4;
      padding: 15px;
      border-left: 4px solid #22c55e;
      border-radius: 5px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Lunar Sign</h1>
    </div>

    <div class="content">
      <p>Hello ${params.recipientName},</p>

      <p>All parties have now signed <strong>${params.documentTitle}</strong>.</p>

      <div class="completion-info">
        <strong>Status:</strong> Complete<br>
        <strong>Document:</strong> ${params.documentTitle}
      </div>

      <p>You can now download the fully signed document:</p>

      <p>
        <a href="${params.downloadUrl}" class="button">Download Signed Document</a>
      </p>
    </div>

    <div class="footer">
      <p>Lunar Sign - Lunar Rails</p>
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `

  return { subject, html }
}
