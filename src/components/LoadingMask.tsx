/**
 * 加载遮罩组件
 * 显示加载状态，提供视觉反馈
 * @param text 加载提示文本，默认为'加载中…'
 */
import React from 'react'

export function LoadingMask({ text = '加载中…' }: { text?: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur">
      <div className="flex items-center gap-2 text-slate-700">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span>{text}</span>
      </div>
    </div>
  )
}

