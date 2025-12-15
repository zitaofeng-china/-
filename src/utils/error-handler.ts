/**
 * 统一错误处理工具
 * 提供统一的错误处理函数，确保错误处理逻辑一致
 */

/**
 * 处理 Renderer 未初始化的错误
 * @param operation 操作名称
 * @param fallback 可选的回调函数，在 renderer 未初始化时执行
 * @returns 是否 renderer 已初始化
 */
export function handleRendererError(
  renderer: any,
  operation: string,
  fallback?: () => void
): boolean {
  if (!renderer) {
    console.warn(`${operation}：renderer未初始化`)
    fallback?.()
    return false
  }
  return true
}

/**
 * 处理一般错误并显示提示
 * @param error 错误对象
 * @param operation 操作名称
 * @param setMessage 设置错误消息的函数（可选）
 */
export function handleError(
  error: unknown,
  operation: string,
  setMessage?: (message: string) => void
): void {
  const errorMessage = error instanceof Error ? error.message : '未知错误'
  const fullMessage = `${operation}失败：${errorMessage}`
  
  console.error(fullMessage, error)
  
  if (setMessage) {
    setMessage(fullMessage)
  }
}

