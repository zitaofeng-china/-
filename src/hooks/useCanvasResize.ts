/**
 * Canvas尺寸调整Hook
 * 监听窗口大小变化，自动触发回调函数以更新Canvas尺寸
 * @param handler 窗口大小变化时的回调函数
 */
import { useEffect } from 'react'

export function useCanvasResize(handler: () => void) {
  useEffect(() => {
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [handler])
}

