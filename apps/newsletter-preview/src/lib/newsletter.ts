import { marked } from 'marked'

export interface NewsletterIssue {
  slug: string
  title: string
  subject: string
  date: string
  htmlBody: string
  rawBody: string
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHTML(raw: string): string {
  return raw.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch)
}

function generateEmailHTML(subject: string, htmlBody: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(subject)}</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
    ${htmlBody}
  </div>
  <p style="color: #999; font-size: 12px; margin-top: 30px;">
    You're receiving this because you subscribed to the newsletter.
    <a href="#" style="color: #999;">Unsubscribe</a>
  </p>
</body>
</html>`
}

export function parseNewsletterIssue(slug: string, content: string): NewsletterIssue {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)

  let title = 'Newsletter'
  let subject = 'Newsletter'
  let date = ''

  if (fmMatch?.[1]) {
    const fm = fmMatch[1]
    const titleMatch = fm.match(/title:\s*["'](.+?)["']/)
    const subjectMatch = fm.match(/subject:\s*["'](.+?)["']/)
    const dateMatch = fm.match(/date:\s*["']?(.+?)["']?(?:\n|$)/)

    if (titleMatch?.[1]) title = titleMatch[1]
    if (subjectMatch?.[1]) subject = subjectMatch[1]
    if (dateMatch?.[1]) date = dateMatch[1].trim()
  }

  const body = fmMatch ? content.slice(fmMatch[0].length).trim() : content.trim()
  const rawBody = body
  const htmlBody = marked.parse(body) as string

  return {
    slug,
    title,
    subject,
    date,
    htmlBody: generateEmailHTML(subject, htmlBody),
    rawBody,
  }
}
