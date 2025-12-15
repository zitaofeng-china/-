/**
 * Renderer Hook
 * 统一获取和管理 renderer 实例，避免重复代码
 */
import { useCallback, useRef } from 'react'
import type { Renderer, RendererRef } from '../types'

/**
 * 统一获取 renderer 的 Hook
 * @param rendererRef renderer 的 ref
 * @returns 获取 renderer 的函数和错误处理
 */
export function useRenderer(rendererRef: RendererRef | undefined) {
  const warnedRef = useRef(false)
  const getRenderer = useCallback((): Renderer | null => {
    if (!rendererRef?.current) return null
    const renderer = rendererRef.current.getRenderer?.()
    if (!renderer) {
      if (!warnedRef.current) {
        console.warn('Renderer 未初始化')
        warnedRef.current = true
      }
      return null
    }
    // 初始化成功后，恢复告警开关，避免后续真正异常被吞掉
    warnedRef.current = false
    return renderer
  }, [rendererRef])

  const requireRenderer = useCallback((): Renderer | null => {
    return getRenderer()
  }, [getRenderer])

  return {
    getRenderer,
    requireRenderer
  }
}

