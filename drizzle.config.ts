import { defineConfig } from 'drizzle-kit'
import { mkdirSync } from 'node:fs'

// fresh clone 时 data/ 不存在，libsql 直接报 error 14（连不上库文件）。
// 在配置加载阶段就确保目录存在，令 `npm run db:push` / `npm run dev`
// 真正开箱即用（README 的 zero-config 承诺）
mkdirSync('data', { recursive: true })
import { getDatabaseConfig } from './src/server/db/config'

const config = getDatabaseConfig()

export default defineConfig({
  schema: './src/server/db/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: config.sqlitePath || './data/app.db',
  },
})
