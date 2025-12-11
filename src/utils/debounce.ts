/**
 * 防抖函数
 * 在指定时间内多次调用时，只执行最后一次调用
 * @param fn 要防抖的函数
 * @param wait 等待时间（毫秒），默认200ms
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, wait = 200) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}

