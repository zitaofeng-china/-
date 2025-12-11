/**
 * 裁剪工具组件
 * 提供图像裁剪功能的用户界面
 */
import React from 'react'

type Props = {
  onConfirm?: () => void
}

export function CropTool({ onConfirm }: Props) {
  return (
    <div className="flex flex-col gap-4 text-sm text-slate-700">
      <div>
        <h4 className="font-medium mb-2">裁剪说明</h4>
        <ul className="space-y-1 text-xs text-slate-600 leading-relaxed">
          <li>• 在画布上拖拽裁剪框的边缘或角落来调整大小</li>
          <li>• 拖拽裁剪框内部来移动位置</li>
          <li>• 拖拽顶部旋转手柄来旋转裁剪框</li>
          <li>• 点击"完成裁剪"按钮应用裁剪</li>
        </ul>
      </div>
      {onConfirm && (
        <button
          onClick={onConfirm}
          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          完成裁剪
        </button>
      )}
    </div>
  )
}

