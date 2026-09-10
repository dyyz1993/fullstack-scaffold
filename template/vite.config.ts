import path from 'path'
import { defineConfig, type Plugin } from 'vite'
import devServer from '@hono/vite-dev-server'
import { websocketPlugin, dbPlugin } from './vite-plugins'
// Bundle analysis: npm install -D rollup-plugin-visualizer && npm run build:analyze
let visualizerPlugin: (() => Plugin) | undefined
if (process.env.ANALYZE === 'true') {
  try {
    // @ts-expect-error — optional dev dependency, installed via: npm install -D rollup-plugin-visualizer
    const mod = await import('rollup-plugin-visualizer')
    visualizerPlugin = () =>
      mod.visualizer({
        open: true,
        filename: 'stats.html',
        gzipSize: true,
        brotliSize: true,
      }) as Plugin
  } catch {
    // rollup-plugin-visualizer not installed — run: npm install -D rollup-plugin-visualizer
  }
}
// 说明：构建期 puppeteer 预渲染已移除——ISR 运行时管线（registry fetch +
// renderSSR + __SSR_DATA__ 注入）在请求时产出新鲜 HTML，构建期快照反而会
// 以空数据/错误文本固化页面并在 serveStatic 下遮蔽运行时 ISR。

export default defineConfig({
  server: {
    port: 0,
    host: '0.0.0.0',
    hmr: {
      overlay: false,
    },
    allowedHosts: ['.shanbox.19930810.xyz', 'localhost'],
  },
  plugins: [
    devServer({
      entry: 'src/server/index.ts',
      exclude: [
        /^\/$/,
        /^\/(@[a-zA-Z0-9_-]+|node_modules|__inspect|assets|index\.html|admin\.html|tenant\.html|merchant\.html|src)/,
        /.*\.(ts|tsx|js|jsx|css|json|png|jpg|svg)$/,
      ],
    }),
    websocketPlugin(),
    dbPlugin(),
  ],
  build: {
    outDir: 'dist/client',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin.html'),
        tenant: path.resolve(__dirname, 'tenant.html'),
        merchant: path.resolve(__dirname, 'merchant.html'),
      },
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-hono': ['hono'],
          'vendor-zustand': ['zustand'],
        },
        plugins: [...(visualizerPlugin ? [visualizerPlugin()] : [])],
      },
      onwarn(warning, defaultHandler) {
        // Suppress antd "use client" directive warnings (React Server Components marker)
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
        defaultHandler(warning)
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@client': path.resolve(__dirname, 'src/client'),
      '@server': path.resolve(__dirname, 'src/server'),
      '@admin': path.resolve(__dirname, 'src/admin'),
      '@tenant': path.resolve(__dirname, 'src/tenant'),
      '@merchant': path.resolve(__dirname, 'src/merchant'),
      '@cli': path.resolve(__dirname, 'src/cli'),
    },
  },
})
