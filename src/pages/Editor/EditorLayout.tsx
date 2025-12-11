/**
 * 编辑器布局组件
 * 定义编辑器的整体布局结构，包括工具侧边栏、画布区域和属性面板
 */
import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react'
import { ToolSidebar } from './ToolSidebar'
import { CanvasStage } from './CanvasStage'
import { PropertyPanel } from './PropertyPanel'
import './editor.scss'
import type { TextLayer } from '../../features/text/text.service'

type Props = {
  activeTool: 'crop' | 'filter' | 'draw' | 'text' | null
  onSelectTool: (tool: 'crop' | 'filter' | 'draw' | 'text' | null) => void
  filterState: { brightness: number; contrast: number; saturation: number }
  onFilterChange: (next: { brightness: number; contrast: number; saturation: number }) => void
  fileName: string | null
  onFileNameChange: (name: string | null) => void
  timeline: { id: string; text: string; ts: number; snapshot?: any }[]
  onTimeline: (text: string) => void
  onTimelineClick?: (entry: { id: string; text: string; ts: number; snapshot?: any }) => void
  rendererRef?: React.MutableRefObject<any>
  layers?: { id: string; name: string; w: number; h: number; visible?: boolean }[]
  activeLayerId?: string | null
  onActiveLayerChange?: (id: string | null) => void
  onLayersChange?: (layers: { id: string; name: string; w: number; h: number; visible?: boolean }[]) => void
  textLayerMetadata?: { [layerId: string]: any }
  onTextLayerMetadataChange?: (metadata: { [layerId: string]: any }) => void
  onUpdateTextLayer?: (layerId: string, config: any) => Promise<void>
  onTextLayerCreated?: (layerId: string, config: Omit<TextLayer, 'id' | 'x' | 'y'>) => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
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
  canRedo
}: Props) {
  const canvasStageRef = useRef<{
    handleDrawConfig?: (color: string, size: number) => void
    handleAddText?: (config: Omit<TextLayer, 'id' | 'x' | 'y'>) => void
    handleCropConfirm?: () => void
    handleLayerDelete?: (id: string) => void
    handleLayerVisibilityToggle?: (id: string, visible: boolean) => void
    handleLayerMove?: (id: string, direction: 'up' | 'down') => void
    handleLayerDuplicate?: (id: string) => void
    handleLayerScaleChange?: (id: string, scale: number) => void
    handleLayerScaleChangeEnd?: (id: string, scale: number) => void
    handleLayerRotationChange?: (id: string, rotation: number) => void
    handleLayerRotationChangeEnd?: (id: string, rotation: number) => void
    getRenderer?: () => any
  }>({})

  const handleDrawConfig = (color: string, size: number) => {
    canvasStageRef.current.handleDrawConfig?.(color, size)
  }

  const handleAddText = (config: Omit<TextLayer, 'id' | 'x' | 'y'>) => {
    canvasStageRef.current.handleAddText?.(config)
  }

  const handleCropConfirm = () => {
    canvasStageRef.current.handleCropConfirm?.()
  }

  // 将canvasStageRef传递给父组件
  useEffect(() => {
    if (rendererRef) {
      rendererRef.current = canvasStageRef
    }
  }, [rendererRef])

  return (
    <div className="editor-layout">
      <aside className="editor-sidebar">
        <ToolSidebar activeTool={activeTool} onSelectTool={onSelectTool} />
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
  )
}

