/**
 * 提示消息组件
 * 显示临时提示信息，通常位于屏幕右下角
 * @param message 要显示的消息内容
 */
import React from 'react'

export function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-4 right-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
      {message}
    </div>
  )
}

