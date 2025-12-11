/**
 * 模态框组件
 * 提供弹出式对话框功能，用于显示重要信息或操作
 * @param title 模态框标题
 * @param open 是否显示模态框
 * @param onClose 关闭模态框的回调函数
 * @param children 模态框内容
 */
import React from 'react'
import { Button } from './Button'

type Props = {
  title: string
  open: boolean
  onClose: () => void
  children?: React.ReactNode
}

export function Modal({ title, open, onClose, children }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>
        <div className="text-slate-700">{children}</div>
      </div>
    </div>
  )
}

