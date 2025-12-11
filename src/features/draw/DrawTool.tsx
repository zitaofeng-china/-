/**
 * 绘图工具组件
 * 提供在图像上绘制线条、形状等功能的用户界面
 */
import React, { useState } from 'react'
import Slider from '../../components/ui/Slider'
import { Button } from '../../components/ui/Button'

type Props = {
  onDrawStart?: (color: string, size: number) => void
  onDrawEnd?: () => void
}

export function DrawTool({ onDrawStart, onDrawEnd }: Props) {
  const [color, setColor] = useState('#000000')
  const [size, setSize] = useState(5)

  const presetColors = [
    '#000000',
    '#ffffff',
    '#ef4444',
    '#f59e0b',
    '#eab308',
    '#22c55e',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899'
  ]

  const handleColorChange = (newColor: string) => {
    setColor(newColor)
    onDrawStart?.(newColor, size)
  }

  const handleSizeChange = (newSize: number) => {
    setSize(newSize)
    onDrawStart?.(color, newSize)
  }

  return (
    <div className="flex flex-col gap-4 text-sm text-slate-700">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium">画笔大小</span>
          <span className="text-xs text-slate-500">{size}px</span>
        </div>
        <Slider
          value={size}
          min={1}
          max={50}
          onChange={handleSizeChange}
          onChangeEnd={() => onDrawEnd?.()}
        />
      </div>

      <div>
        <div className="mb-2 font-medium">颜色</div>
        <div className="grid grid-cols-3 gap-2">
          {presetColors.map((presetColor) => (
            <button
              key={presetColor}
              type="button"
              onClick={() => handleColorChange(presetColor)}
              className={`h-10 rounded border-2 transition ${
                color === presetColor ? 'border-blue-600 ring-2 ring-blue-300' : 'border-slate-200'
              }`}
              style={{ backgroundColor: presetColor }}
              aria-label={`选择颜色 ${presetColor}`}
            />
          ))}
        </div>
        <div className="mt-2">
          <label className="block text-xs text-slate-600 mb-1">自定义颜色</label>
          <input
            type="color"
            value={color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="h-8 w-full cursor-pointer rounded border border-slate-200"
          />
        </div>
      </div>

      <div className="text-xs text-slate-500">
        <p>在画布上按住鼠标左键并拖拽来绘制</p>
      </div>
    </div>
  )
}

