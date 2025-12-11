/**
 * 滑动条组件
 * 提供数值范围的滑动调节功能
 * 支持鼠标滚轮操作
 */
import React from 'react'

type Props = {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  onChangeEnd?: () => void
}

export default function Slider({ value, min = 0, max = 100, step = 1, onChange, onChangeEnd }: Props) {
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 根据滚轮方向调整值
    const delta = e.deltaY > 0 ? -step : step
    const newValue = Math.max(min, Math.min(max, value + delta))
    
    // 如果值发生变化，触发 onChange
    if (newValue !== value) {
      onChange(newValue)
    }
  }

  return (
    <input
      type="range"
      className="w-full accent-blue-600"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      onMouseUp={onChangeEnd}
      onTouchEnd={onChangeEnd}
      onWheel={handleWheel}
    />
  )
}

