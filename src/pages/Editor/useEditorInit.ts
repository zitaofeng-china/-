/**
 * 编辑器初始化Hook
 * 占位Hook，用于编辑器初始化逻辑，包括渲染器初始化和默认资源加载
 */
import { useEffect, useState } from 'react'

export function useEditorInit() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // 初始化编辑器资源
    // 这里可以加载默认资源、初始化配置等
    const init = async () => {
      try {
        // 示例：可以在这里加载默认字体、预设配置等
        // await loadDefaultFonts()
        // await loadPresets()
        setIsReady(true)
      } catch (error) {
        console.error('编辑器初始化失败:', error)
        setIsReady(true) // 即使失败也设置为ready，避免阻塞用户
      }
    }

    init()
  }, [])

  return {
    isReady
  }
}

