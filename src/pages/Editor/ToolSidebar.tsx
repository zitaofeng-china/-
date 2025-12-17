/**
 * 工具侧边栏组件
 * 提供编辑器工具的选择和切换功能
 */
import React from 'react'

type Props = {
  activeTool: 'crop' | 'filter' | 'draw' | 'text' | null
  onSelectTool: (tool: 'crop' | 'filter' | 'draw' | 'text' | null) => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  onExport?: () => void
  onReset?: () => void
}

// 选择工具图标（虚线框）
const SelectIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="5" y="5" width="14" height="14" strokeDasharray="3 2" />
    <path d="M9 5V3M15 5V3M5 9H3M5 15H3M9 21V19M15 21V19M21 9H19M21 15H19" />
  </svg>
)

// 撤销图标
const UndoIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-9 9" />
  </svg>
)

// 重做图标
const RedoIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 9 9" />
  </svg>
)

// 裁剪图标
const CropIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
    <path d="M18 22V8a2 2 0 0 0-2-2H2" />
  </svg>
)

// 滤镜图标
const FilterIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v6m0 6v6" />
    <path d="m4.2 4.2 4.3 4.3m7 7 4.3 4.3" />
    <path d="M1 12h6m6 0h6" />
    <path d="m4.2 19.8 4.3-4.3m7-7 4.3-4.3" />
  </svg>
)

// 画笔图标
const DrawIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m18 2 4 4-14 14H4v-4L18 2z" />
    <path d="M14.5 5.5 18.5 9.5" />
  </svg>
)

// 文字图标
const TextIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
)

// 导出图标（软盘）
const ExportIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h12l4 4v12H4z" />
    <path d="M12 16v-6" />
    <path d="M9 13l3 3 3-3" />
    <path d="M4 9h12" />
  </svg>
)

// 重置/删除图标（垃圾桶）
const ResetIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M5 6l1 14h12l1-14" />
  </svg>
)

export function ToolSidebar({
  activeTool,
  onSelectTool,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  onReset
}: Props) {
  const tools = [
    { id: 'select' as const, icon: <SelectIcon />, title: '选择' },
    { id: 'crop' as const, icon: <CropIcon />, title: '裁剪' },
    { id: 'filter' as const, icon: <FilterIcon />, title: '滤镜' },
    { id: 'draw' as const, icon: <DrawIcon />, title: '涂鸦' },
    { id: 'text' as const, icon: <TextIcon />, title: '文字' },
  ]

  return (
    <div className="tool-sidebar">
      {/* 撤销/重做按钮 */}
      <button
        className="tool-button"
        onClick={onUndo}
        disabled={!canUndo}
        title="撤销 (Ctrl+Z)"
      >
        <UndoIcon />
      </button>
      <button
        className="tool-button"
        onClick={onRedo}
        disabled={!canRedo}
        title="重做 (Ctrl+Y)"
      >
        <RedoIcon />
      </button>
      
      <div className="tool-divider" />
      
      {/* 工具按钮 */}
      {tools.map((tool, index) => (
        <React.Fragment key={tool.id}>
          <button
            className={`tool-button ${tool.id === 'select' ? (activeTool === null ? 'active' : '') : activeTool === tool.id ? 'active' : ''}`}
            onClick={() => {
              if (tool.id === 'select') {
                onSelectTool(null)
              } else {
                onSelectTool(activeTool === tool.id ? null : tool.id)
              }
            }}
            title={tool.title}
          >
            {tool.icon}
          </button>
          {index < tools.length - 1 && <div className="tool-divider" />}
        </React.Fragment>
      ))}

      <div className="tool-divider" />

      {/* 导出与重置 */}
      <button
        className="tool-button"
        onClick={onExport}
        title="导出"
      >
        <ExportIcon />
      </button>
      <button
        className="tool-button"
        onClick={onReset}
        title="重置"
      >
        <ResetIcon />
      </button>
    </div>
  )
}
