/**
 * 入口级 last-resort onError 的状态码解析。
 *
 * 必须与 entries/cloudflare.ts 的语义一致：AppError 携带 `statusCode`
 * （而非 `status`），只检查 `status` 会把所有认证/校验错误（401/403/400）
 * 降级成 500。
 */
export function resolveErrorStatus(err: unknown): number {
  if (
    err instanceof Error &&
    'statusCode' in err &&
    typeof (err as { statusCode: unknown }).statusCode === 'number'
  ) {
    return (err as { statusCode: number }).statusCode
  }
  if (
    err instanceof Error &&
    'status' in err &&
    typeof (err as { status: unknown }).status === 'number'
  ) {
    return (err as { status: number }).status
  }
  return 500
}
