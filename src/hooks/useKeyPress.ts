/**
 * 按键监听Hook
 * 监听指定按键的按下事件，触发回调函数
 * @param key 要监听的按键名称
 * @param handler 按键按下时的回调函数
 */
import { useEffect } from 'react'

export function useKeyPress(key: string, handler: () => void) {
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === key) handler()
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [key, handler])
}

