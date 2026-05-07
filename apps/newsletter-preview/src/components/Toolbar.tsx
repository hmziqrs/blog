import type { EmailClient } from '../clients/types'

interface ToolbarProps {
  client: EmailClient
  onClientChange: (client: EmailClient) => void
  deviceType: 'mobile' | 'desktop'
  onDeviceChange: (device: 'mobile' | 'desktop') => void
  darkMode: boolean
  onDarkModeChange: (enabled: boolean) => void
  showFullEmail: boolean
  onShowFullEmailChange: (show: boolean) => void
  selectedSlug: string
  onSlugChange: (slug: string) => void
  slugs: string[]
}

const clientOptions: { value: EmailClient; label: string }[] = [
  { value: 'raw', label: 'Browser (Raw)' },
  { value: 'gmail', label: 'Gmail Web' },
  { value: 'outlook', label: 'Outlook' },
]

export function Toolbar({
  client,
  onClientChange,
  deviceType,
  onDeviceChange,
  darkMode,
  onDarkModeChange,
  showFullEmail,
  onShowFullEmailChange,
  selectedSlug,
  onSlugChange,
  slugs,
}: ToolbarProps) {
  return (
    <div className="bg-bg-secondary border-b border-border p-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
        {/* Newsletter selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary font-medium">Newsletter:</label>
          <select
            value={selectedSlug}
            onChange={(e) => onSlugChange(e.target.value)}
            className="bg-bg-tertiary text-text-primary text-sm rounded-lg px-3 py-2 border border-border focus:ring-2 focus:ring-accent focus:border-accent min-w-[200px]"
          >
            {slugs.map((slug) => (
              <option key={slug} value={slug}>
                {slug}
              </option>
            ))}
          </select>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Client selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary font-medium">Client:</label>
          <div className="flex bg-bg-tertiary rounded-lg p-1 border border-border">
            {clientOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onClientChange(option.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  client === option.value
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Device toggle */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary font-medium">Device:</label>
          <div className="flex bg-bg-tertiary rounded-lg p-1 border border-border">
            <button
              onClick={() => onDeviceChange('desktop')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                deviceType === 'desktop'
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Desktop
            </button>
            <button
              onClick={() => onDeviceChange('mobile')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                deviceType === 'mobile'
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Mobile
            </button>
          </div>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Dark mode toggle */}
        <button
          onClick={() => onDarkModeChange(!darkMode)}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            darkMode
              ? 'bg-accent/20 border-accent text-accent'
              : 'bg-bg-tertiary border-border text-text-secondary hover:text-text-primary'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {darkMode ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            )}
          </svg>
          {darkMode ? 'Light' : 'Dark'}
        </button>

        <div className="w-px h-6 bg-border" />

        {/* Full email toggle */}
        <button
          onClick={() => onShowFullEmailChange(!showFullEmail)}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            showFullEmail
              ? 'bg-success/20 border-success text-success'
              : 'bg-bg-tertiary border-border text-text-secondary hover:text-text-primary'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          {showFullEmail ? 'Full Email' : 'Body Only'}
        </button>
      </div>
    </div>
  )
}
