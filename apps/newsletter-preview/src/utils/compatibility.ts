import type { ClientConfig, CssRestriction } from '../clients/types'

export interface CompatibilityIssue {
  property: string
  value: string
  reason: string
  location: 'inline' | 'style-block'
  occurrences: number
}

export interface CompatibilityReport {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  totalIssues: number
  issues: CompatibilityIssue[]
  hasExternalStylesheets: boolean
  hasAtImport: boolean
}

const PENALTY_EXTERNAL_STYLESHEET = 10
const PENALTY_AT_IMPORT = 8
const PENALTY_PER_ISSUE = 3

function isRestricted(property: string, value: string, restriction: CssRestriction): boolean {
  if (restriction.property !== property) return false
  if (!restriction.unsupportedValues) return true
  const normalizedValue = value.trim().toLowerCase()
  return restriction.unsupportedValues.some((v) => normalizedValue.startsWith(v))
}

function calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 50) return 'C'
  if (score >= 25) return 'D'
  return 'F'
}

class IssueTracker {
  private map = new Map<string, CompatibilityIssue>()

  add(property: string, value: string, reason: string, location: 'inline' | 'style-block') {
    const key = `${property}:${location}`
    const existing = this.map.get(key)
    if (existing) {
      existing.occurrences++
    } else {
      this.map.set(key, { property, value, reason, location, occurrences: 1 })
    }
  }

  toArray(): CompatibilityIssue[] {
    return Array.from(this.map.values())
  }

  get size(): number {
    return this.map.size
  }
}

export function analyzeCompatibility(html: string, config: ClientConfig): CompatibilityReport {
  const tracker = new IssueTracker()

  const hasExternalStylesheets =
    config.stripExternalStylesheets === true &&
    /<link[^>]+rel\s*=\s*["']stylesheet["'][^>]*\/?>/gi.test(html)

  let hasAtImport = false
  if (config.stripAtImport) {
    const styleBlockRegex = /<style([^>]*)>([\s\S]*?)<\/style>/gi
    let match
    while ((match = styleBlockRegex.exec(html)) !== null) {
      if (match[2] && /@import\s+[^;]+;/gi.test(match[2])) {
        hasAtImport = true
        break
      }
    }
  }

  html.replace(
    /<style([^>]*)>([\s\S]*?)<\/style>/gi,
    (_match, _attrs: string, blockContent: string) => {
      blockContent.replace(
        /([a-z-]+)\s*:\s*([^;}\n]+)/gi,
        (_, property: string, value: string) => {
          const prop = property.trim().toLowerCase()
          const val = value.trim()
          const restriction = config.cssRestrictions.find((r) => isRestricted(prop, val, r))
          if (restriction) {
            tracker.add(prop, val, restriction.reason, 'style-block')
          }
          return ''
        },
      )
      return ''
    },
  )

  html.replace(/style\s*=\s*"([^"]*)"/gi, (_match, styleStr: string) => {
    scanDeclarations(styleStr, config, tracker, 'inline')
    return ''
  })

  html.replace(/style\s*=\s*'([^']*)'/gi, (_match, styleStr: string) => {
    scanDeclarations(styleStr, config, tracker, 'inline')
    return ''
  })

  let score = 100
  if (hasExternalStylesheets) score -= PENALTY_EXTERNAL_STYLESHEET
  if (hasAtImport) score -= PENALTY_AT_IMPORT
  score -= tracker.size * PENALTY_PER_ISSUE
  score = Math.max(0, score)

  const issues = tracker.toArray()

  return {
    score,
    grade: calculateGrade(score),
    totalIssues: issues.length + (hasExternalStylesheets ? 1 : 0) + (hasAtImport ? 1 : 0),
    issues,
    hasExternalStylesheets,
    hasAtImport,
  }
}

function scanDeclarations(
  styleStr: string,
  config: ClientConfig,
  tracker: IssueTracker,
  location: 'inline' | 'style-block',
) {
  const declarations = styleStr
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':')
    if (colonIdx === -1) continue
    const property = decl.slice(0, colonIdx).trim().toLowerCase()
    const value = decl.slice(colonIdx + 1).trim()
    const restriction = config.cssRestrictions.find((r) => isRestricted(property, value, r))
    if (restriction) {
      tracker.add(property, value, restriction.reason, location)
    }
  }
}
