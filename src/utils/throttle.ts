/**
 * 节流函数
 * 在指定时间内多次调用时，只执行一次调用
 * @param fn 要节流的函数
 * @param wait 等待时间（毫秒），默认200ms
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => void>(fn: T, wait = 200) {
  let last = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - last >= wait) {
      last = now
      fn(...args)
    }
  }
}

