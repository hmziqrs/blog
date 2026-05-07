import type { ClientConfig } from './types'

export const gmailConfig: ClientConfig = {
  id: 'gmail',
  name: 'Gmail Web',
  version: '2024',
  stripExternalStylesheets: true,
  stripAtImport: true,
  stripFontFace: true,
  stripMediaQueries: false,
  styleBlockCharLimit: 8192,
  cssRestrictions: [
    {
      property: 'position',
      reason: 'Gmail does not support CSS positioning',
    },
    {
      property: 'top',
      reason: 'Gmail does not support position offset properties',
    },
    {
      property: 'right',
      reason: 'Gmail does not support position offset properties',
    },
    {
      property: 'bottom',
      reason: 'Gmail does not support position offset properties',
    },
    {
      property: 'left',
      reason: 'Gmail does not support position offset properties',
    },
    {
      property: 'z-index',
      reason: 'Gmail does not support z-index',
    },
    {
      property: 'transform',
      reason: 'Gmail does not support CSS transforms',
    },
    {
      property: '-webkit-transform',
      reason: 'Gmail does not support CSS transforms',
    },
    {
      property: 'animation',
      reason: 'Gmail does not support CSS animations',
    },
    {
      property: '-webkit-animation',
      reason: 'Gmail does not support CSS animations',
    },
    {
      property: 'transition',
      reason: 'Gmail does not support CSS transitions',
    },
    {
      property: 'box-shadow',
      reason: 'Gmail does not support box-shadow',
    },
    {
      property: 'align-items',
      reason: 'Gmail does not support flexbox layout properties (display: flex is supported)',
    },
    {
      property: 'justify-content',
      reason: 'Gmail does not support flexbox layout properties',
    },
    {
      property: 'flex-direction',
      reason: 'Gmail does not support flexbox layout properties',
    },
    {
      property: 'flex-wrap',
      reason: 'Gmail does not support flexbox layout properties',
    },
    {
      property: 'flex',
      reason: 'Gmail does not support flexbox layout properties',
    },
    {
      property: 'grid',
      reason: 'Gmail does not support CSS Grid layout sub-properties (display: grid is supported)',
    },
    {
      property: 'grid-template-columns',
      reason: 'Gmail does not support CSS Grid layout sub-properties (display: grid is supported)',
    },
    {
      property: 'grid-template-rows',
      reason: 'Gmail does not support CSS Grid layout sub-properties (display: grid is supported)',
    },
    {
      property: 'grid-column',
      reason: 'Gmail does not support CSS Grid layout sub-properties (display: grid is supported)',
    },
    {
      property: 'grid-row',
      reason: 'Gmail does not support CSS Grid layout sub-properties (display: grid is supported)',
    },
    {
      property: 'gap',
      reason: 'Gmail does not support CSS Grid layout sub-properties (display: grid is supported)',
    },
    {
      property: 'grid-gap',
      reason: 'Gmail does not support CSS Grid layout sub-properties (display: grid is supported)',
    },
    {
      property: 'clip-path',
      reason: 'Gmail does not support clip-path',
    },
    {
      property: 'backdrop-filter',
      reason: 'Gmail does not support backdrop-filter',
    },
    {
      property: '-webkit-backdrop-filter',
      reason: 'Gmail does not support backdrop-filter',
    },
    {
      property: 'filter',
      reason: 'Gmail does not support filter',
    },
    {
      property: 'aspect-ratio',
      reason: 'Gmail does not support aspect-ratio',
    },
    {
      property: 'resize',
      reason: 'Gmail does not support resize',
    },
    {
      property: 'user-select',
      reason: 'Gmail does not support user-select',
    },
    {
      property: 'pointer-events',
      reason: 'Gmail does not support pointer-events',
    },
  ],
}
