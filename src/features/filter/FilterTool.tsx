/**
 * 滤镜工具组件
 * 提供图像滤镜调节的用户界面，包括亮度、对比度、饱和度等调节功能
 */
import React from 'react'
import Slider from '../../components/ui/Slider'
import { Button } from '../../components/ui/Button'

type FilterState = { brightness: number; contrast: number; saturation: number }

type Props = {
  filter: FilterState
  onChange: (next: FilterState) => void
  onCommit?: (key: keyof FilterState) => void
}

export function FilterTool({ filter, onChange, onCommit }: Props) {
  const update = (key: keyof FilterState, value: number) => onChange({ ...filter, [key]: value })
  const reset = () => onChange({ brightness: 100, contrast: 100, saturation: 100 })

  return (
    <div className="flex flex-col gap-4 text-sm text-slate-700">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span>亮度</span>
          <span>{filter.brightness}%</span>
        </div>
        <Slider
          value={filter.brightness}
          min={0}
          max={200}
          onChange={(v) => update('brightness', v)}
          onChangeEnd={() => onCommit?.('brightness')}
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span>对比度</span>
          <span>{filter.contrast}%</span>
        </div>
        <Slider
          value={filter.contrast}
          min={0}
          max={200}
          onChange={(v) => update('contrast', v)}
          onChangeEnd={() => onCommit?.('contrast')}
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span>饱和度</span>
          <span>{filter.saturation}%</span>
        </div>
        <Slider
          value={filter.saturation}
          min={0}
          max={200}
          onChange={(v) => update('saturation', v)}
          onChangeEnd={() => onCommit?.('saturation')}
        />
      </div>
      <Button variant="ghost" onClick={reset}>
        重置
      </Button>
    </div>
  )
}

