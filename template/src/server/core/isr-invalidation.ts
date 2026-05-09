/**
 * @framework-baseline a124c5bce28416ca
 *
 * @framework-modify
 * @reason 自动生成的基准更新
 * @impact 无功能影响
 */

/**
 * ISR cache invalidation utilities.
 * Call these from service layer when content changes.
 */

import type { ISRCache } from './isr-cache'

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
  await _cache.purge('/')
  await _cache.purge('/todos')
  await _cache.purge('/content')
  await _cache.purge('/notifications')
  await _cache.purge('/websocket')
  await _cache.purgePattern('isr:/content/*')
}
