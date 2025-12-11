/**
 * 工具侧边栏组件
 * 提供编辑器工具的选择和切换功能
 */
import React from 'react'
import { Button } from '../../components/ui/Button'

type Props = {
  activeTool: 'crop' | 'filter' | 'draw' | 'text' | null
  onSelectTool: (tool: 'crop' | 'filter' | 'draw' | 'text' | null) => void
}

export function ToolSidebar({ activeTool, onSelectTool }: Props) {
  return (
    <div className="editor-panel-block">
      <h3>工具</h3>
      <div className="flex flex-col gap-2">
        <Button
          variant={activeTool === 'crop' ? 'primary' : 'ghost'}
          onClick={() => onSelectTool(activeTool === 'crop' ? null : 'crop')}
        >
          裁剪
        </Button>
        <Button
          variant={activeTool === 'filter' ? 'primary' : 'ghost'}
          onClick={() => onSelectTool(activeTool === 'filter' ? null : 'filter')}
        >
          滤镜
        </Button>
        <Button
          variant={activeTool === 'draw' ? 'primary' : 'ghost'}
          onClick={() => onSelectTool(activeTool === 'draw' ? null : 'draw')}
        >
          涂鸦
        </Button>
        <Button
          variant={activeTool === 'text' ? 'primary' : 'ghost'}
          onClick={() => onSelectTool(activeTool === 'text' ? null : 'text')}
        >
          文字
        </Button>
      </div>
    </div>
  )
}

