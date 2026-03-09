export type RpcMethod<T extends { rpc: unknown }> = keyof T['rpc']
export type EventName<T extends { events: unknown }> = keyof T['events']

export type RpcInput<T extends { rpc: unknown }, M extends RpcMethod<T>> = T['rpc'][M] extends {
  in: infer I
}
  ? I
  : never

export type RpcOutput<T extends { rpc: unknown }, M extends RpcMethod<T>> = T['rpc'][M] extends {
  out: infer O
}
  ? O
  : never

export type EventPayload<T extends { events: unknown }, E extends EventName<T>> = T['events'][E]
