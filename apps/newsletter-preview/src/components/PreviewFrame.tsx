import { useEffect, useRef } from 'react'
import type { EmailClient } from '../clients/types'
import { getDarkModeCss } from '../utils/dark-mode'

interface PreviewFrameProps {
  html: string
  client: EmailClient
  darkMode: boolean
  width: number
  deviceType: 'mobile' | 'desktop'
}

export function PreviewFrame({ html, client, darkMode, width, deviceType }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const darkModeCss = getDarkModeCss(client, darkMode)

    const doc = iframe.contentDocument
    if (!doc) return

    doc.open()
    doc.write(`
      ${html}
      <style>
        ${darkModeCss}
      </style>
    `)
    doc.close()
  }, [html, client, darkMode])

  const height = deviceType === 'mobile' ? 700 : 800

  return (
    <iframe
      ref={iframeRef}
      title="Email Preview"
      sandbox="allow-same-origin"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        border: 'none',
        background: '#ffffff',
        display: 'block',
      }}
    />
  )
}
