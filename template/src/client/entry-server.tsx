/**
 * @framework-baseline 00b6a72a77e03864
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
import { getSsrPage } from './ssr-pages'
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

  // 服务端把 ISR 数据挂到 globalThis：组件的 ssrInitial*() 在 renderToString
  // 期间与浏览器水合同源读取（globalThis === window），首帧即渲染真实内容
  const globalData = globalThis as { __SSR_DATA__?: unknown }
  globalData.__SSR_DATA__ = data

  try {
    // 页面级 SSR：ISR 路由有静态同构组件（ssr-pages）——渲染真实页面
    // 内容而非 lazy Loading 壳（SEO 核心）；其余路由回退 AppRoutes 壳。
    const SsrPage = getSsrPage(pathname)
    const body = SsrPage
      ? React.createElement(
          HelmetProvider,
          { context: helmetContext },
          React.createElement(StaticRouter, { location: pathname }, React.createElement(SsrPage))
        )
      : React.createElement(
          HelmetProvider,
          { context: helmetContext },
          React.createElement(
            StaticRouter,
            { location: pathname },
            React.createElement(AppRoutes, { presetId: preset })
          )
        )
    const html = renderToString(body)

    // 5. Extract helmet data
    const helmet = (helmetContext as { helmet?: Record<string, unknown> }).helmet || {}
    const titleStr = helmet.title?.toString() || ''
    const metaStr = helmet.meta?.toString() || ''

    return { html, helmet: { title: titleStr, meta: metaStr } }
  } finally {
    // 6. Restore store state + 清理服务端数据挂载（防跨请求泄漏）
    restoreEntryStores(snapshot)
    delete globalData.__SSR_DATA__
  }
}
