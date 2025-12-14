/**
 * 编辑器布局组件
 * 定义编辑器的整体布局结构，包括工具侧边栏、画布区域和属性面板
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

import { ImageUploader } from '../../components/ImageUploader'
import { CanvasStage } from './CanvasStage'
import { PropertyPanel } from './PropertyPanel'
import { ToolSidebar } from './ToolSidebar'
import './editor.scss'
import type { Renderer } from '../../canvas/engine'
import type { TextLayer } from '../../features/text/text.service'
import type { CanvasStageRef, EditorSnapshot, TextLayerMetadata } from './index'

type Props = {
  activeTool: 'crop' | 'filter' | 'draw' | 'text' | null
  onSelectTool: (tool: 'crop' | 'filter' | 'draw' | 'text' | null) => void
  filterState: { brightness: number; contrast: number; saturation: number; hue: number; blur: number; sharpen: number }
  onFilterChange: (next: { brightness: number; contrast: number; saturation: number; hue: number; blur: number; sharpen: number }) => void
  fileName: string | null
  onFileNameChange: (name: string | null) => void
  timeline: { id: string; text: string; ts: number; snapshot?: EditorSnapshot }[]
  onTimeline: (text: string) => void
  onTimelineClick?: (entry: { id: string; text: string; ts: number; snapshot?: EditorSnapshot }) => void
  rendererRef?: React.MutableRefObject<CanvasStageRef | null>
  layers?: { id: string; name: string; w: number; h: number; visible?: boolean }[]
  activeLayerId?: string | null
  onActiveLayerChange?: (id: string | null) => void
  onLayersChange?: (layers: { id: string; name: string; w: number; h: number; visible?: boolean }[]) => void
  textLayerMetadata?: TextLayerMetadata
  onTextLayerMetadataChange?: (metadata: TextLayerMetadata) => void
  onUpdateTextLayer?: (layerId: string, config: Omit<TextLayer, 'id' | 'x' | 'y'>) => Promise<void>
  onTextLayerCreated?: (layerId: string, config: Omit<TextLayer, 'id' | 'x' | 'y'>) => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  onExport?: () => void
  onReset?: () => void
  canvasSize?: { width: number; height: number }
  zoom?: number
  onFileSelect?: (file: File) => void
}

export function EditorLayout({
  activeTool,
  onSelectTool,
  filterState,
  onFilterChange,
  fileName,
  onFileNameChange,
  timeline,
  onTimeline,
  onTimelineClick,
  rendererRef,
  activeLayerId,
  onActiveLayerChange,
  layers,
  onLayersChange,
  textLayerMetadata,
  onTextLayerMetadataChange,
  onUpdateTextLayer,
  onTextLayerCreated,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  onReset,
  canvasSize,
  zoom = 100,
  onFileSelect
}: Props) {
  const canvasStageRef = useRef<CanvasStageRef | null>(null)

  const handleDrawConfig = (color: string, size: number) => {
    canvasStageRef.current?.handleDrawConfig?.(color, size)
  }

  const handleAddText = (config: Omit<TextLayer, 'id' | 'x' | 'y'>) => {
    canvasStageRef.current?.handleAddText?.(config)
  }

  const handleCropConfirm = () => {
    canvasStageRef.current?.handleCropConfirm?.()
  }

  // 将canvasStageRef传递给父组件
  useEffect(() => {
    if (rendererRef) {
      rendererRef.current = canvasStageRef.current
    }
  }, [rendererRef])

  return (
    <div className="editor-layout">
      {/* 顶部操作栏 */}
      <header className="editor-header">
        <div className="editor-header-left">
          <span className="px-4 py-2 text-sm text-slate-300">画布编辑区</span>
          <ImageUploader onSelect={onFileSelect} />
        </div>
        <div className="editor-header-right">
          <button
            className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onUndo}
            disabled={!canUndo}
            title="撤销 (Ctrl+Z)"
          >
            撤销
          </button>
          <button
            className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onRedo}
            disabled={!canRedo}
            title="重做 (Ctrl+Y)"
          >
            重做
          </button>
          <button
            className="px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition"
            onClick={onExport}
            title="导出图像"
          >
            导出
          </button>
          <button
            className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded transition"
            onClick={onReset}
            title="重置编辑器"
          >
            重置
          </button>
        </div>
      </header>

      {/* 主体区域 */}
      <div className="editor-body">
        <aside className="editor-sidebar">
          <ToolSidebar 
            activeTool={activeTool} 
            onSelectTool={onSelectTool}
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </aside>
        <main className="editor-canvas">
        <CanvasStage
          ref={canvasStageRef}
          cropEnabled={activeTool === 'crop'}
          drawEnabled={activeTool === 'draw'}
          textEnabled={activeTool === 'text'}
          filterState={filterState}
          onFilterChange={onFilterChange}
          onFileNameChange={onFileNameChange}
          onTimeline={onTimeline}
          activeLayerId={activeLayerId}
          onActiveLayerChange={onActiveLayerChange}
          onLayersChange={onLayersChange}
          onTextLayerCreated={onTextLayerCreated}
          textLayerMetadata={textLayerMetadata}
          onUpdateTextLayer={onUpdateTextLayer}
          onSelectTool={onSelectTool}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </main>
      <section className="editor-panel">
        <PropertyPanel
          activeTool={activeTool}
          filterState={filterState}
          onFilterChange={onFilterChange}
          onSelectTool={onSelectTool}
          fileName={fileName}
          timeline={timeline}
          onTimeline={onTimeline}
          onTimelineClick={onTimelineClick}
          rendererRef={rendererRef}
          activeLayerId={activeLayerId}
          onActiveLayerChange={onActiveLayerChange}
          layers={layers}
          onCropConfirm={handleCropConfirm}
          onDrawConfig={handleDrawConfig}
          onAddText={handleAddText}
          onLayerDelete={(id) => {
            canvasStageRef.current?.handleLayerDelete?.(id)
          }}
          onLayerVisibilityToggle={(id, visible) => {
            canvasStageRef.current?.handleLayerVisibilityToggle?.(id, visible)
          }}
          onLayerMove={(id, direction) => {
            canvasStageRef.current?.handleLayerMove?.(id, direction)
          }}
          onLayerDuplicate={(id) => {
            canvasStageRef.current?.handleLayerDuplicate?.(id)
          }}
          onLayerScaleChange={(id, scale) => {
            canvasStageRef.current?.handleLayerScaleChange?.(id, scale)
          }}
          onLayerScaleChangeEnd={(id, scale) => {
            canvasStageRef.current?.handleLayerScaleChangeEnd?.(id, scale)
          }}
          onLayerRotationChange={(id, rotation) => {
            canvasStageRef.current?.handleLayerRotationChange?.(id, rotation)
          }}
          onLayerRotationChangeEnd={(id, rotation) => {
            canvasStageRef.current?.handleLayerRotationChangeEnd?.(id, rotation)
          }}
          renderer={canvasStageRef.current?.getRenderer?.()}
          textLayerMetadata={textLayerMetadata}
          onTextLayerMetadataChange={onTextLayerMetadataChange}
          onUpdateTextLayer={onUpdateTextLayer}
        />
        </section>
      </div>

      {/* 底部状态栏 */}
      <footer className="editor-footer">
        <div className="editor-footer-left">
          {canvasSize && (
            <span>
              {canvasSize.width} × {canvasSize.height} 像素
            </span>
          )}
        </div>
        <div className="editor-footer-center">
          <span>{layers?.length || 0} 个图层</span>
        </div>
        <div className="editor-footer-right">
          <span>缩放: {zoom}%</span>
        </div>
      </footer>
    </div>
  )
}

