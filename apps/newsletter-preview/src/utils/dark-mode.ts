import type { EmailClient } from '../clients/types'

export type DarkModeStrategy = 'none' | 'full-inversion' | 'partial-inversion' | 'color-scheme'

export interface DarkModeConfig {
  strategy: DarkModeStrategy
  css: string
  colorScheme: boolean
}

const NONE_CSS = `
  html { background-color: #1a1a1a !important; }
`

const FULL_INVERSION_CSS = `
  html { background-color: #1a1a1a !important; }
  body { filter: invert(0.9) hue-rotate(180deg) !important; }
  img, video, picture, picture source {
    filter: invert(0.9) hue-rotate(180deg) !important;
  }
`

const PARTIAL_INVERSION_CSS = `
  html { background-color: #1e1e1e !important; }
  body { filter: invert(0.85) hue-rotate(180deg) !important; }
  img, video, picture, picture source {
    filter: invert(0.85) hue-rotate(180deg) !important;
  }
`

const configs: Record<EmailClient, DarkModeConfig> = {
  gmail: {
    strategy: 'none',
    css: NONE_CSS,
    colorScheme: false,
  },
  outlook: {
    strategy: 'partial-inversion',
    css: PARTIAL_INVERSION_CSS,
    colorScheme: false,
  },
  raw: {
    strategy: 'full-inversion',
    css: FULL_INVERSION_CSS,
    colorScheme: false,
  },
}

export function getDarkModeConfig(client: EmailClient): DarkModeConfig {
  return configs[client]
}

export function getDarkModeCss(client: EmailClient, enabled: boolean): string {
  if (!enabled) return ''
  return configs[client].css
}
