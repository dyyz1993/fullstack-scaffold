/**
 * vitest setupFile：把测试库从 :memory: 换成每进程独立的临时文件。
 *
 * 为什么不能用 :memory:——@libsql/client 的 transaction() 会置空内部连接
 * （#db = null，事务跑在旧连接上），下一次普通查询惰性新建连接；文件库
 * 会重开同一文件，而 :memory: 会得到一个全新的空库（后续所有查询
 * "no such table"）。租户开通等真实事务依赖此修正。
 */
import { tmpdir } from 'os'
import { join } from 'path'
import { existsSync, rmSync } from 'fs'

if (!process.env.SQLITE_PATH || process.env.SQLITE_PATH === ':memory:') {
  const dbPath = join(tmpdir(), `cfs-test-${process.pid}.db`)
  // 旧运行可能残留旧 DDL 的库（IF NOT EXISTS 不会升级表结构）——先删干净
  for (const f of [dbPath, `${dbPath}-journal`, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (existsSync(f)) rmSync(f)
  }
  process.env.SQLITE_PATH = dbPath
}
