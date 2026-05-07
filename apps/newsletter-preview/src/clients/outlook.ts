import type { ClientConfig } from './types'

export const outlookConfig: ClientConfig = {
  id: 'outlook',
  name: 'Outlook',
  version: '2019-2021 (Word engine)',
  stripExternalStylesheets: true,
  stripAtImport: true,
  stripFontFace: true,
  stripMediaQueries: true,
  cssRestrictions: [
    {
      property: 'position',
      reason: 'Outlook Word renderer does not support CSS positioning',
    },
    {
      property: 'top',
      reason: 'Outlook Word renderer does not support position offsets',
    },
    {
      property: 'right',
      reason: 'Outlook Word renderer does not support position offsets',
    },
    {
      property: 'bottom',
      reason: 'Outlook Word renderer does not support position offsets',
    },
    {
      property: 'left',
      reason: 'Outlook Word renderer does not support position offsets',
    },
    {
      property: 'z-index',
      reason: 'Outlook Word renderer does not support position offsets',
    },
    {
      property: 'display',
      reason: 'Outlook Word renderer does not support flexbox or grid',
      unsupportedValues: ['flex', 'inline-flex', 'grid', 'inline-grid'],
    },
    {
      property: 'align-items',
      reason: 'Outlook Word renderer does not support flexbox properties',
    },
    {
      property: 'justify-content',
      reason: 'Outlook Word renderer does not support flexbox properties',
    },
    {
      property: 'flex-direction',
      reason: 'Outlook Word renderer does not support flexbox properties',
    },
    {
      property: 'flex-wrap',
      reason: 'Outlook Word renderer does not support flexbox properties',
    },
    {
      property: 'flex',
      reason: 'Outlook Word renderer does not support flexbox properties',
    },
    {
      property: 'grid',
      reason: 'Outlook Word renderer does not support CSS Grid',
    },
    {
      property: 'grid-template-columns',
      reason: 'Outlook Word renderer does not support CSS Grid',
    },
    {
      property: 'grid-template-rows',
      reason: 'Outlook Word renderer does not support CSS Grid',
    },
    {
      property: 'grid-column',
      reason: 'Outlook Word renderer does not support CSS Grid',
    },
    {
      property: 'grid-row',
      reason: 'Outlook Word renderer does not support CSS Grid',
    },
    {
      property: 'gap',
      reason: 'Outlook Word renderer does not support CSS Grid',
    },
    {
      property: 'grid-gap',
      reason: 'Outlook Word renderer does not support CSS Grid',
    },
    {
      property: 'border-radius',
      reason: 'Outlook Word renderer does not support border-radius',
    },
    {
      property: 'box-shadow',
      reason: 'Outlook Word renderer does not support box-shadow',
    },
    {
      property: 'animation',
      reason: 'Outlook Word renderer does not support animations',
    },
    {
      property: '-webkit-animation',
      reason: 'Outlook Word renderer does not support animations',
    },
    {
      property: 'transition',
      reason: 'Outlook Word renderer does not support transitions',
    },
    {
      property: 'transform',
      reason: 'Outlook Word renderer does not support transforms',
    },
    {
      property: '-webkit-transform',
      reason: 'Outlook Word renderer does not support transforms',
    },
    {
      property: 'clip-path',
      reason: 'Outlook Word renderer does not support clip-path',
    },
    {
      property: 'backdrop-filter',
      reason: 'Outlook Word renderer does not support backdrop-filter',
    },
    {
      property: '-webkit-backdrop-filter',
      reason: 'Outlook Word renderer does not support backdrop-filter',
    },
    {
      property: 'background-size',
      reason: 'Outlook Word renderer does not support background-size',
    },
    {
      property: 'max-width',
      reason: 'Outlook Word renderer has inconsistent max/min-width support',
    },
    {
      property: 'min-width',
      reason: 'Outlook Word renderer has inconsistent max/min-width support',
    },
    {
      property: 'float',
      reason: 'Outlook Word renderer does not support float',
    },
    {
      property: 'aspect-ratio',
      reason: 'Outlook Word renderer does not support aspect-ratio',
    },
  ],
}
