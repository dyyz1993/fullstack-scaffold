/**
 * @framework-baseline a124c5bce28416ca
 *
 * @framework-modify
 * @reason 模块化改造：purgeAllPages 改为遍历注册表
 * @impact 不再硬编码路由列表
 */

import type { ISRCache } from './isr-cache'
import { isrRegistry } from './isr-registry'

let _cache: ISRCache | null = null

export function setISRCache(cache: ISRCache): void {
  _cache = cache
}

export function getISRCache(): ISRCache | null {
  return _cache
}

export async function purgePage(pathname: string): Promise<void> {
  if (!_cache) return
  await _cache.purge(pathname)
}

export async function purgeContentPages(): Promise<void> {
  if (!_cache) return
  await _cache.purge('/content')
  await _cache.purgePattern('isr:/content/*')
}

export async function purgeAllPages(): Promise<void> {
  if (!_cache) return
  for (const path of isrRegistry.getExactPaths()) {
    await _cache.purge(path)
  }
  await _cache.purgePattern('isr:/content/*')
}
