import type { ClientConfig, CssRestriction } from '../clients/types'

export interface FilterResult {
  html: string
  warnings: string[]
}

function isRestricted(property: string, value: string, restriction: CssRestriction): boolean {
  if (restriction.property !== property) return false
  if (!restriction.unsupportedValues) return true
  const normalizedValue = value.trim().toLowerCase()
  return restriction.unsupportedValues.some((v) => normalizedValue.startsWith(v))
}

export function filterInlineStyles(html: string, config: ClientConfig): FilterResult {
  const warnings: string[] = []

  let result = html.replace(/style\s*=\s*"([^"]*)"/gi, (_match, styleStr: string) => {
    const { kept, newWarnings } = filterDeclarations(styleStr, config)
    warnings.push(...newWarnings)
    return `style="${kept.join('; ')}"`
  })

  result = result.replace(/style\s*=\s*'([^']*)'/gi, (_match, styleStr: string) => {
    const { kept, newWarnings } = filterDeclarations(styleStr, config)
    warnings.push(...newWarnings)
    return `style='${kept.join('; ')}'`
  })

  return { html: result, warnings }
}

export function filterStyleBlocks(html: string, config: ClientConfig): FilterResult {
  const warnings: string[] = []

  const result = html.replace(
    /<style([^>]*)>([\s\S]*?)<\/style>/gi,
    (_match, attrs: string, blockContent: string) => {
      const filtered = blockContent.replace(
        /([a-z-]+)\s*:\s*([^;}\n]+)/gi,
        (declMatch, property: string, value: string) => {
          const prop = property.trim().toLowerCase()
          const val = value.trim()
          const restriction = config.cssRestrictions.find((r) => isRestricted(prop, val, r))
          if (restriction) {
            warnings.push(
              `[mailpeek] ${config.name}: removed "${prop}: ${val}" — ${restriction.reason}`,
            )
            return ''
          }
          return declMatch
        },
      )
      return `<style${attrs}>${filtered}</style>`
    },
  )

  return { html: result, warnings }
}

function stripExternalStylesheets(html: string, config: ClientConfig): FilterResult {
  if (!config.stripExternalStylesheets) {
    return { html, warnings: [] }
  }
  const warnings: string[] = []
  const result = html.replace(/<link[^>]+rel\s*=\s*["']stylesheet["'][^>]*\/?>/gi, () => {
    warnings.push(
      `[mailpeek] ${config.name}: removed external stylesheet (<link rel="stylesheet">) — ${config.name} strips external stylesheets`,
    )
    return ''
  })
  return { html: result, warnings }
}

function stripAtImport(html: string, config: ClientConfig): FilterResult {
  if (!config.stripAtImport) {
    return { html, warnings: [] }
  }
  const warnings: string[] = []
  const result = html.replace(
    /<style([^>]*)>([\s\S]*?)<\/style>/gi,
    (_match, attrs: string, blockContent: string) => {
      const filtered = blockContent.replace(/@import\s+[^;]+;/gi, () => {
        warnings.push(
          `[mailpeek] ${config.name}: removed @import rule — ${config.name} strips @import rules`,
        )
        return ''
      })
      return `<style${attrs}>${filtered}</style>`
    },
  )
  return { html: result, warnings }
}

function stripFontFace(html: string, config: ClientConfig): FilterResult {
  if (!config.stripFontFace) {
    return { html, warnings: [] }
  }
  const warnings: string[] = []
  const result = html.replace(
    /<style([^>]*)>([\s\S]*?)<\/style>/gi,
    (_match, attrs: string, blockContent: string) => {
      const filtered = blockContent.replace(/@font-face\s*\{[^}]*\}/gi, () => {
        warnings.push(
          `[mailpeek] ${config.name}: removed @font-face — ${config.name} strips web font declarations`,
        )
        return ''
      })
      return `<style${attrs}>${filtered}</style>`
    },
  )
  return { html: result, warnings }
}

function stripMediaQueries(html: string, config: ClientConfig): FilterResult {
  if (!config.stripMediaQueries) {
    return { html, warnings: [] }
  }
  const warnings: string[] = []
  const result = html.replace(
    /<style([^>]*)>([\s\S]*?)<\/style>/gi,
    (_match, attrs: string, blockContent: string) => {
      const filtered = blockContent.replace(/@media\s*[^{]*\{[\s\S]*?\}\s*\}/gi, () => {
        warnings.push(
          `[mailpeek] ${config.name}: removed @media query — ${config.name} does not support media queries`,
        )
        return ''
      })
      return `<style${attrs}>${filtered}</style>`
    },
  )
  return { html: result, warnings }
}

function enforceStyleBlockLimit(html: string, config: ClientConfig): FilterResult {
  if (!config.styleBlockCharLimit) {
    return { html, warnings: [] }
  }
  const limit = config.styleBlockCharLimit
  const warnings: string[] = []
  const result = html.replace(
    /<style([^>]*)>([\s\S]*?)<\/style>/gi,
    (match, _attrs: string, blockContent: string) => {
      if (blockContent.length > limit) {
        warnings.push(
          `[mailpeek] ${config.name}: removed <style> block (${blockContent.length} chars exceeds ${limit} char limit)`,
        )
        return ''
      }
      return match
    },
  )
  return { html: result, warnings }
}

export function filterHtml(html: string, config: ClientConfig): FilterResult {
  const allWarnings: string[] = []

  const pass1 = stripExternalStylesheets(html, config)
  allWarnings.push(...pass1.warnings)

  const pass2 = stripAtImport(pass1.html, config)
  allWarnings.push(...pass2.warnings)

  const pass3 = stripFontFace(pass2.html, config)
  allWarnings.push(...pass3.warnings)

  const pass4 = stripMediaQueries(pass3.html, config)
  allWarnings.push(...pass4.warnings)

  const pass5 = filterStyleBlocks(pass4.html, config)
  allWarnings.push(...pass5.warnings)

  const pass6 = filterInlineStyles(pass5.html, config)
  allWarnings.push(...pass6.warnings)

  const pass7 = enforceStyleBlockLimit(pass6.html, config)
  allWarnings.push(...pass7.warnings)

  return { html: pass7.html, warnings: allWarnings }
}

function filterDeclarations(
  styleStr: string,
  config: ClientConfig,
): { kept: string[]; newWarnings: string[] } {
  const declarations = styleStr
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
  const kept: string[] = []
  const newWarnings: string[] = []

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':')
    if (colonIdx === -1) {
      kept.push(decl)
      continue
    }
    const property = decl.slice(0, colonIdx).trim().toLowerCase()
    const value = decl.slice(colonIdx + 1).trim()

    const restriction = config.cssRestrictions.find((r) => isRestricted(property, value, r))
    if (restriction) {
      newWarnings.push(
        `[mailpeek] ${config.name}: removed "${property}: ${value}" — ${restriction.reason}`,
      )
    } else {
      kept.push(decl)
    }
  }

  return { kept, newWarnings }
}
