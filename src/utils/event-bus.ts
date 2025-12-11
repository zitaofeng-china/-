/**
 * 事件总线
 * 用于组件间的解耦通信，支持事件的订阅、取消订阅和触发
 */
type Handler = (...args: any[]) => void

const listeners = new Map<string, Set<Handler>>()

/**
 * 订阅事件
 * @param event 事件名称
 * @param handler 事件处理函数
 * @returns 取消订阅的函数
 */
export function on(event: string, handler: Handler) {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event)!.add(handler)
  return () => off(event, handler)
}

/**
 * 取消订阅事件
 * @param event 事件名称
 * @param handler 要移除的事件处理函数
 */
export function off(event: string, handler: Handler) {
  listeners.get(event)?.delete(handler)
}

/**
 * 触发事件
 * @param event 事件名称
 * @param args 传递给处理函数的参数
 */
export function emit(event: string, ...args: any[]) {
  listeners.get(event)?.forEach((handler) => handler(...args))
}

