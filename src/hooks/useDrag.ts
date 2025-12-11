import { useRef } from 'react'

/**
 * 拖拽Hook
 * 处理鼠标拖拽事件，计算拖拽偏移量并触发回调
 * @param onDrag 拖拽过程中的回调函数，接收x和y方向的偏移量
 * @param onEnd 拖拽结束时的回调函数（可选）
 * @param onStart 拖拽开始时的回调函数（可选）
 * @returns 返回onMouseDown事件处理器，用于绑定到元素
 */
export function useDrag(
  onDrag: (dx: number, dy: number) => void,
  onEnd?: () => void,
  onStart?: () => void
) {
  const last = useRef<{ x: number; y: number } | null>(null)

  const onMouseDown = (e: React.MouseEvent) => {
    last.current = { x: e.clientX, y: e.clientY }
    onStart?.()
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!last.current) return
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }
    onDrag(dx, dy)
  }

  const onMouseUp = () => {
    last.current = null
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    onEnd?.()
  }

  return { onMouseDown }
}

