/**
 * RPC 客户端对象合并（get-fallback Proxy）
 *
 * 用途：当同一路径段（如 'admin'）由多个模块路由文件共同提供时，
 * 把两个窄客户端的子对象合并成一个类型交集，避免在类型层面重新
 * 链式 merge 触发 TS2589。
 *
 * 语义：primary 优先，secondary 兜底。两个来源的子路径约定互不重叠
 * （重叠时取 primary 的），因此 get-fallback 足够且无需枚举键。
 */

export function mergeRpcObjects<T extends object, U extends object>(
  primary: T,
  secondary: U
): T & U {
  return new Proxy({} as T & U, {
    get(_target, prop) {
      if (prop in primary) {
        return Reflect.get(primary as object, prop, primary)
      }
      return Reflect.get(secondary as object, prop, secondary)
    },
    has(_target, prop) {
      return prop in primary || prop in secondary
    },
  })
}
