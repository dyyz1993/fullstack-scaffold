/**
 * @framework-baseline 1a361bf1bb0e5343
 */

/**
 * SSR Entry Point — used by ISR pipeline to render real React components.
 *
 * This module:
 * 1. Pre-populates Zustand stores with ISR-fetched data (via generated entry-stores)
 * 2. Renders the app to HTML string via renderToString
 * 3. Restores stores after render
 */

import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

import { AppRoutes } from './AppRoutes'
import {
  snapshotEntryStores,
  seedEntryStores,
  restoreEntryStores,
  type SSRData,
} from './stores/entry-stores'

interface SSRRenderResult {
  html: string
  helmet: {
    title: string
    meta: string
  }
}

/**
 * Render the app to HTML string for a given pathname.
 * Pre-populates stores with ISR data so components render real content.
 */
export function renderSSR(pathname: string, data: SSRData): SSRRenderResult {
  // 1. Snapshot current store state (for cleanup)
  const snapshot = snapshotEntryStores()

  // 2. Pre-populate stores with ISR data (no-op when preset has no seedable stores)
  seedEntryStores(data)

  // 3. Set default preset
  const preset = 'todo'

  // 4. Render with helmet context to extract head tags
  const helmetContext: Record<string, unknown> = {}

  try {
    const html = renderToString(
      React.createElement(
        HelmetProvider,
        { context: helmetContext },
        React.createElement(
          StaticRouter,
          { location: pathname },
          React.createElement(AppRoutes, { presetId: preset })
        )
      )
    )

    // 5. Extract helmet data
    const helmet = (helmetContext as { helmet?: Record<string, unknown> }).helmet || {}
    const titleStr = helmet.title?.toString() || ''
    const metaStr = helmet.meta?.toString() || ''

    return { html, helmet: { title: titleStr, meta: metaStr } }
  } finally {
    // 6. Restore store state
    restoreEntryStores(snapshot)
  }
}
