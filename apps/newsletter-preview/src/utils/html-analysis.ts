export interface EmailMetadata {
  subject: string | null
  previewText: string | null
  fileSize: { bytes: number; formatted: string; isWarning: boolean }
}

export function extractSubject(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!match?.[1]) return null
  const trimmed = match[1].trim()
  return trimmed.length > 0 ? trimmed : null
}

export function extractPreviewText(html: string): string | null {
  const spanPreheaderMatch = html.match(
    /<span[^>]*class="[^"]*preheader[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
  )
  if (spanPreheaderMatch?.[1]) {
    const text = cleanPreviewText(stripTags(spanPreheaderMatch[1]))
    if (text.length > 0) return truncate(text, 100)
  }

  const divPreheaderMatch = html.match(
    /<div[^>]*class="[^"]*preheader[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  )
  if (divPreheaderMatch?.[1]) {
    const text = cleanPreviewText(stripTags(divPreheaderMatch[1]))
    if (text.length > 0) return truncate(text, 100)
  }

  const hiddenMatch = html.match(
    /<(?:span|div)[^>]*style="[^"]*display\s*:\s*none[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/i,
  )
  if (hiddenMatch?.[1]) {
    const text = cleanPreviewText(stripTags(hiddenMatch[1]))
    if (text.length > 0) return truncate(text, 100)
  }

  let bodyContent = html
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch?.[1]) {
    bodyContent = bodyMatch[1]
  }

  bodyContent = bodyContent.replace(
    /<(?:span|div)[^>]*style="[^"]*display\s*:\s*none[^"]*"[^>]*>[\s\S]*?<\/(?:span|div)>/gi,
    '',
  )

  const visibleText = cleanPreviewText(stripTags(bodyContent))
  if (visibleText.length > 0) return truncate(visibleText, 100)

  return null
}

export function calculateFileSize(html: string): {
  bytes: number
  formatted: string
  isWarning: boolean
} {
  const bytes = new Blob([html]).size
  const kb = bytes / 1024
  const formatted = kb.toFixed(1) + ' KB'
  const isWarning = bytes > 102400
  return { bytes, formatted, isWarning }
}

export function analyzeEmail(html: string): EmailMetadata {
  return {
    subject: extractSubject(html),
    previewText: extractPreviewText(html),
    fileSize: calculateFileSize(html),
  }
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
}

function cleanPreviewText(text: string): string {
  return text
    .replace(/[\u034F\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) : text
}
