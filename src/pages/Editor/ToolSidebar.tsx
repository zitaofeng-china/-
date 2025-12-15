/**
 * 工具侧边栏组件
 * 提供编辑器工具的选择和切换功能
 */
import React from 'react'
import type { EditorTool } from '../../types'

type Props = {
  activeTool: EditorTool
  onSelectTool: (tool: EditorTool) => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

export function ToolSidebar({ activeTool, onSelectTool, onUndo, onRedo, canUndo, canRedo }: Props) {
  return (
    <div className="tool-sidebar">
      <div className="tool-sidebar-header">
        {/* 撤销（上一步） */}
        <button
          className="tool-button"
          onClick={onUndo}
          disabled={!canUndo}
          title="撤销（上一步）"
        >
          <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>

        {/* 重做（下一步） */}
        <button
          className="tool-button"
          onClick={onRedo}
          disabled={!canRedo}
          title="重做（下一步）"
        >
          <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 11" />
          </svg>
        </button>
      </div>
      <div className="tool-sidebar-list">
        {/* 选择工具 - 虚线方框 */}
        <button
          className={`tool-button ${activeTool === null ? 'active' : ''}`}
          onClick={() => onSelectTool(null)}
          title="选择工具"
        >
          <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" strokeDasharray="4 4" rx="2" />
          </svg>
        </button>

        {/* 裁剪工具 */}
        <button
          className={`tool-button ${activeTool === 'crop' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'crop' ? null : 'crop')}
          title="裁剪工具"
        >
          <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2v4h4" />
            <path d="M18 2v4h-4" />
            <path d="M6 22v-4h4" />
            <path d="M18 22v-4h-4" />
            <rect x="2" y="6" width="20" height="12" rx="1" />
          </svg>
        </button>

        {/* 画笔工具 */}
        <button
          className={`tool-button ${activeTool === 'draw' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'draw' ? null : 'draw')}
          title="画笔工具"
        >
          <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m12 19 7-7 3 3-7 7-3-3z" />
            <path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="m2 2 7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
        </button>

        {/* 文字工具 */}
        <button
          className={`tool-button ${activeTool === 'text' ? 'active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'text' ? null : 'text')}
          title="文字工具"
        >
          <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 20h16" />
            <path d="M6 20V4h6a4 4 0 0 1 4 4v4" />
          </svg>
        </button>

        {/* 分隔线 */}
        <div className="tool-divider" />

        {/* 保存 */}
        <button
          className="tool-button"
          onClick={() => {}}
          title="保存"
        >
          <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </button>

        {/* 删除 */}
        <button
          className="tool-button"
          onClick={() => {}}
          title="删除"
        >
          <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

