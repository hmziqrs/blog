import { useState, useMemo, useEffect } from 'react'
import { newsletters as rawNewsletters } from 'virtual:newsletters'
import { parseNewsletterIssue } from '../lib/newsletter'
import type { EmailClient } from '../clients/types'
import { gmailConfig } from '../clients/gmail'
import { outlookConfig } from '../clients/outlook'
import { filterHtml } from '../utils/css-filter'
import { analyzeCompatibility } from '../utils/compatibility'
import { analyzeEmail } from '../utils/html-analysis'
import { Toolbar } from './Toolbar'
import { PreviewFrame } from './PreviewFrame'
import { CompatibilityPanel } from './CompatibilityPanel'

function getClientConfig(client: EmailClient) {
  switch (client) {
    case 'gmail':
      return gmailConfig
    case 'outlook':
      return outlookConfig
    default:
      return null
  }
}

function getClientName(client: EmailClient): string {
  switch (client) {
    case 'gmail':
      return 'Gmail Web'
    case 'outlook':
      return 'Outlook 2019-2021'
    default:
      return 'Browser'
  }
}

export function App() {
  const parsedNewsletters = useMemo(() => {
    return rawNewsletters
      .map((n) => parseNewsletterIssue(n.slug, n.content))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [])

  const [selectedSlug, setSelectedSlug] = useState(() => {
    const last = parsedNewsletters[parsedNewsletters.length - 1]
    return last?.slug ?? ''
  })
  const [client, setClient] = useState<EmailClient>('raw')
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop')
  const [darkMode, setDarkMode] = useState(false)
  const [showFullEmail, setShowFullEmail] = useState(true)
  const [warnings, setWarnings] = useState<string[]>([])

  const selectedNewsletter = parsedNewsletters.find((n) => n.slug === selectedSlug)

  const previewHtml = useMemo(() => {
    if (!selectedNewsletter) return ''
    const html = showFullEmail ? selectedNewsletter.htmlBody : selectedNewsletter.rawBody
    const config = getClientConfig(client)
    if (!config) return html
    const result = filterHtml(html, config)
    setWarnings(result.warnings)
    return result.html
  }, [selectedNewsletter, client, showFullEmail])

  const compatibilityReport = useMemo(() => {
    if (!selectedNewsletter) return null
    const config = getClientConfig(client)
    if (!config) return null
    return analyzeCompatibility(
      showFullEmail ? selectedNewsletter.htmlBody : selectedNewsletter.rawBody,
      config,
    )
  }, [selectedNewsletter, client, showFullEmail])

  const metadata = useMemo(() => {
    if (!selectedNewsletter) return null
    return analyzeEmail(selectedNewsletter.htmlBody)
  }, [selectedNewsletter])

  const previewWidth = deviceType === 'mobile' ? 375 : 600

  useEffect(() => {
    if (warnings.length > 0) {
      console.group(`Email CSS Warnings (${client})`)
      warnings.forEach((w) => console.warn(w))
      console.groupEnd()
    }
  }, [warnings, client])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-bg-secondary border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">Newsletter Preview</h1>
              <p className="text-xs text-text-muted">Local email client simulator</p>
            </div>
          </div>

          {metadata && (
            <div className="flex items-center gap-4 text-xs text-text-secondary">
              {metadata.subject && (
                <div>
                  <span className="text-text-muted">Subject:</span>{' '}
                  <span className="text-text-primary font-medium">{metadata.subject}</span>
                </div>
              )}
              <div>
                <span className="text-text-muted">Size:</span>{' '}
                <span
                  className={`font-medium ${
                    metadata.fileSize.isWarning ? 'text-danger' : 'text-text-primary'
                  }`}
                >
                  {metadata.fileSize.formatted}
                </span>
                {metadata.fileSize.isWarning && (
                  <span className="text-danger ml-1">(clipped in Gmail)</span>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Toolbar */}
      <Toolbar
        client={client}
        onClientChange={setClient}
        deviceType={deviceType}
        onDeviceChange={setDeviceType}
        darkMode={darkMode}
        onDarkModeChange={setDarkMode}
        showFullEmail={showFullEmail}
        onShowFullEmailChange={setShowFullEmail}
        selectedSlug={selectedSlug}
        onSlugChange={setSelectedSlug}
        slugs={parsedNewsletters.map((n) => n.slug)}
      />

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Preview area */}
        <div className="flex-1 bg-bg-primary p-6 overflow-auto">
          <div className="flex justify-center min-h-full">
            {selectedNewsletter ? (
              deviceType === 'mobile' ? (
                <div className="phone-frame relative">
                  <div className="phone-notch" />
                  <PreviewFrame
                    html={previewHtml}
                    client={client}
                    darkMode={darkMode}
                    width={previewWidth}
                    deviceType={deviceType}
                  />
                </div>
              ) : (
                <div className="desktop-frame w-full max-w-[800px]">
                  <div className="desktop-header">
                    <div className="desktop-dot bg-red-500" />
                    <div className="desktop-dot bg-yellow-500" />
                    <div className="desktop-dot bg-green-500" />
                    <span className="text-xs text-text-muted ml-2">
                      {getClientName(client)} — {selectedNewsletter.title}
                    </span>
                  </div>
                  <div className="flex justify-center py-4 bg-white">
                    <PreviewFrame
                      html={previewHtml}
                      client={client}
                      darkMode={darkMode}
                      width={previewWidth}
                      deviceType={deviceType}
                    />
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center text-text-muted">
                <div className="text-center">
                  <svg
                    className="w-12 h-12 mx-auto mb-4 opacity-50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-lg font-medium">No newsletters found</p>
                  <p className="text-sm mt-1">
                    Add markdown files to <code className="bg-bg-tertiary px-1.5 py-0.5 rounded">content/newsletters/</code>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-bg-secondary border-l border-border p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Newsletter list */}
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-2">Newsletters</h3>
              <div className="space-y-1">
                {parsedNewsletters.map((newsletter) => (
                  <button
                    key={newsletter.slug}
                    onClick={() => setSelectedSlug(newsletter.slug)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedSlug === newsletter.slug
                        ? 'bg-accent/20 text-accent border border-accent/30'
                        : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                    }`}
                  >
                    <div className="font-medium truncate">{newsletter.title}</div>
                    {newsletter.date && (
                      <div className="text-xs text-text-muted mt-0.5">{newsletter.date}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Compatibility panel */}
            {compatibilityReport && (
              <CompatibilityPanel
                report={compatibilityReport}
                clientName={getClientName(client)}
              />
            )}

            {/* Preview text */}
            {metadata?.previewText && (
              <div className="bg-bg-secondary border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-text-primary mb-2">Preview Text</h3>
                <p className="text-xs text-text-secondary">{metadata.previewText}</p>
              </div>
            )}

            {/* Info */}
            <div className="bg-bg-primary border border-border rounded-lg p-4 text-xs text-text-muted space-y-2">
              <p>
                <strong className="text-text-secondary">Gmail:</strong> Strips positioning,
                transforms, animations, box-shadow, flex/grid sub-properties, @font-face. Style
                blocks over 8KB are removed.
              </p>
              <p>
                <strong className="text-text-secondary">Outlook:</strong> Strips everything Gmail
                does, plus border-radius, display:flex/grid, background-size, max/min-width, float.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
