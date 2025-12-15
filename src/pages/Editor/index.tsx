/**
 * 编辑器主页面组件
 * 图像编辑器的入口页面，管理编辑器的整体状态和工具切换
 */
import React, { useState } from 'react'

import { EditorLayout } from './EditorLayout'
import { resetHistory } from '../../features/history/history.service'
import { mapRendererLayersToUI } from '../../utils/layer-utils'
import { useRenderer } from '../../hooks/useRenderer'
import type {
  EditorTool,
  EditorSnapshot,
  LayerSnapshot,
  TextLayerMetadata,
  CanvasStageRef,
  Renderer,
  RendererLayer,
  TimelineEntry
} from '../../types'
import type { UILayer } from '../../types/layer'
import type { TextLayer } from '../../types/tool'

// ==================== 常量定义 ====================

/** 最大历史记录数量 */
const MAX_HISTORY_COUNT = 40

/** 最大历史记录体积（字节），25MB 软上限 */
const MAX_HISTORY_BYTES = 25 * 1024 * 1024

// ==================== 工具函数 ====================

/**
 * 判断时间线条目是否允许显示
 */
const isTimelineAllowed = (text: string): boolean =>
  text.startsWith('切换到') ||
  text === '关闭工具' ||
  text.startsWith('手动保存') ||
  text.startsWith('快捷键保存')

/**
 * 估算快照占用的字节数
 * @param snapshot 编辑器快照
 * @returns 估算的字节数（粗估：base64长度 * 0.75）
 */
const estimateSnapshotBytes = (snapshot?: EditorSnapshot): number => {
  if (!snapshot) return 0
  
  const dataUrlSize = (dataUrl: string): number => 
    Math.max(0, dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75
  
  let total = 0
  snapshot.layers.forEach((l: LayerSnapshot) => {
    total += dataUrlSize(l.bitmapDataUrl)
  })
  return total
}

export default function Editor() {
  const [activeTool, setActiveTool] = useState<EditorTool>(null)
  const [filterState, setFilterState] = useState({ brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sharpen: 0 })
  const [fileName, setFileName] = useState<string | null>(null)
  // history：用于撤销/重做的完整快照栈；timeline：用于展示的精简记录
  const [history, setHistory] = useState<TimelineEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [layers, setLayers] = useState<UILayer[]>([])
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [textLayerMetadata, setTextLayerMetadata] = useState<TextLayerMetadata>({})
  const filterLogGate = React.useRef(0)
  const rendererRef = React.useRef<CanvasStageRef | null>(null)
  const { getRenderer } = useRenderer(rendererRef)
  const historyBytesRef = React.useRef<number>(0)

  // ==================== 组件内部函数 ====================

  /**
   * 创建状态快照（包含每个图层位图的dataURL）
   */
  const createSnapshot = (): EditorSnapshot | null => {
    const renderer = getRenderer()
    
    // 即使没有renderer，也创建一个基本快照（用于记录状态）
    if (!renderer) {
      return {
        filterState: { ...filterState },
        layers: [],
        activeLayerIndex: -1,
        fileName,
        viewState: {
          zoom: 1,
          offset: { x: 0, y: 0 }
        }
      }
    }

    const layers = renderer.state.layers
    const activeLayerIndex = layers.findIndex((l) => l.id === activeLayerId)

    const layerSnapshots: LayerSnapshot[] = layers.map((layer: RendererLayer) => {
      // 将当前layer的bitmap序列化为dataURL
      const canvas = document.createElement('canvas')
      canvas.width = layer.bitmap.width
      canvas.height = layer.bitmap.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('无法创建Canvas上下文以序列化图层')
      }
      ctx.drawImage(layer.bitmap, 0, 0)
      const bitmapDataUrl = canvas.toDataURL('image/png')

      const isTextLayer = typeof layer.name === 'string' && layer.name.startsWith('Text:')
      const textConfig = isTextLayer ? textLayerMetadata[layer.id] : undefined

      return {
        name: layer.name,
        offset: { ...layer.offset },
        visible: layer.visible,
        scale: layer.scale,
        rotation: layer.rotation,
        opacity: layer.opacity,
        blendMode: layer.blendMode,
        locked: layer.locked,
        bitmapDataUrl,
        isTextLayer,
        textConfig
      }
    })

    return {
      filterState: { ...filterState },
      layers: layerSnapshots,
      activeLayerIndex,
      fileName,
      viewState: {
        zoom: renderer.state.zoom,
        offset: { ...renderer.state.offset }
      }
    }
  }

  /**
   * 恢复状态快照
   */
  const restoreSnapshot = async (snapshot: EditorSnapshot): Promise<void> => {
    const renderer = getRenderer()
    if (!renderer) {
      console.warn('无法恢复：renderer未初始化')
      setFilterState(snapshot.filterState)
      setActiveLayerId(null)
      setFileName(snapshot.fileName)
      setLayers([])
      setTextLayerMetadata({})
      return
    }

    try {
      // 清空现有图层
      const existing = [...renderer.state.layers]
      existing.forEach((l: RendererLayer) => renderer.deleteLayer(l.id))

      // 恢复滤镜状态
      setFilterState(snapshot.filterState)
      renderer.setFilter(snapshot.filterState)

      // 按顺序恢复图层
      const newMetadata: TextLayerMetadata = {}
      for (const layerSnapshot of snapshot.layers) {
        const response = await fetch(layerSnapshot.bitmapDataUrl)
        const blob = await response.blob()
        const file = new File([blob], `${layerSnapshot.name}.png`, { type: 'image/png' })
        await renderer.addImage(file, layerSnapshot.name, layerSnapshot.offset)
        const addedLayer = renderer.state.layers[renderer.state.layers.length - 1]
        renderer.setLayerVisibility(addedLayer.id, layerSnapshot.visible)
        renderer.setLayerScale(addedLayer.id, layerSnapshot.scale)
        renderer.setLayerRotation(addedLayer.id, layerSnapshot.rotation)
        renderer.setLayerOpacity(addedLayer.id, layerSnapshot.opacity ?? 1)
        renderer.setLayerBlendMode(addedLayer.id, layerSnapshot.blendMode ?? 'source-over')
        renderer.setLayerLocked(addedLayer.id, layerSnapshot.locked ?? false)
        // 如果有文本配置，记录新的layerId对应的配置
        if (layerSnapshot.isTextLayer && layerSnapshot.textConfig) {
          newMetadata[addedLayer.id] = layerSnapshot.textConfig
        }
      }

      // 恢复视图状态
      renderer.setView({
        zoom: snapshot.viewState.zoom,
        offset: snapshot.viewState.offset
      })

      // 恢复激活图层（按索引映射新的ID）
      const newActive =
        snapshot.activeLayerIndex >= 0 && snapshot.activeLayerIndex < renderer.state.layers.length
          ? renderer.state.layers[snapshot.activeLayerIndex].id
          : null
      setActiveLayerId(newActive)
      setFileName(snapshot.fileName)

      // 同步元数据和图层列表
      setTextLayerMetadata(newMetadata)
      const currentLayers = renderer.state.layers
      setLayers(mapRendererLayersToUI(currentLayers))
    } catch (error) {
      console.error('恢复状态时出错:', error)
    }
  }

  const addTimeline = (text: string, saveSnapshot: boolean = true) => {
    const allowed = isTimelineAllowed(text)
    // 始终为历史栈创建记录（用于撤销/重做），但仅在 allowed 时显示在时间线
    let snapshot: EditorSnapshot | undefined = undefined
    if (saveSnapshot) {
      try {
        snapshot = createSnapshot() || undefined
      } catch (error) {
        console.warn('创建快照失败:', error)
        // 即使快照创建失败，也创建一个基本快照
        snapshot = {
          filterState: { ...filterState },
          layers: [],
          activeLayerIndex: -1,
          fileName,
          viewState: {
            zoom: 1,
            offset: { x: 0, y: 0 }
          }
        }
      }
    }
    
    const entry: TimelineEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text,
      ts: Date.now(),
      snapshot
    }
    
    setHistory((prev) => {
      // 如果当前在中间位置，先截断重做分支
      const baseIndex = historyIndex >= 0 ? historyIndex : prev.length - 1
      const withoutRedo =
        baseIndex >= 0 && baseIndex < prev.length - 1 ? prev.slice(0, baseIndex + 1) : prev

      let appended = [...withoutRedo, entry]

      // 按数量和体积双重约束修剪
      const calcBytes = (arr: TimelineEntry[]) =>
        arr.reduce((sum, it) => sum + estimateSnapshotBytes(it.snapshot), 0)

      // 先按数量裁剪到最多 MAX_HISTORY_COUNT 条
      if (appended.length > MAX_HISTORY_COUNT) {
        const overflow = appended.length - MAX_HISTORY_COUNT
        appended = appended.slice(overflow)
      }

      // 再按字节上限裁剪（从最旧开始剔除）
      let bytes = calcBytes(appended)
      while (bytes > MAX_HISTORY_BYTES && appended.length > 1) {
        appended = appended.slice(1)
        bytes = calcBytes(appended)
      }
      historyBytesRef.current = bytes

      const trimmed = appended
      const newIndex = trimmed.length - 1
      setHistoryIndex(newIndex)
      // 同步可见时间线（只保留 allowed 的记录）
      setTimeline(trimmed.filter((t) => isTimelineAllowed(t.text)))
      return trimmed
    })
    
    // 如果无需展示，则直接返回
    if (!allowed) return
  }

  const handleTimelineClick = async (entry: TimelineEntry) => {
    if (!entry.snapshot) {
      console.warn('此记录没有快照，无法恢复:', entry.text)
      return
    }
    const idx = history.findIndex((t) => t.id === entry.id)
    if (idx === -1) return
    await restoreSnapshot(entry.snapshot)
    setHistoryIndex(idx)
  }

  const findValidSnapshotIndexBackward = (start: number) => {
    for (let i = start; i >= 0; i--) {
      if (history[i]?.snapshot) return i
    }
    return -1
  }

  const findValidSnapshotIndexForward = (start: number) => {
    for (let i = start; i < history.length; i++) {
      if (history[i]?.snapshot) return i
    }
    return -1
  }

  const handleUndo = React.useCallback(async () => {
    if (history.length === 0) return
    const current = historyIndex >= 0 ? historyIndex : history.length - 1
    const target = findValidSnapshotIndexBackward(current - 1)
    if (target === -1) return
    const entry = history[target]
    if (entry.snapshot) {
      await restoreSnapshot(entry.snapshot)
      setHistoryIndex(target)
    }
  }, [history, historyIndex])

  const handleRedo = React.useCallback(async () => {
    if (history.length === 0) return
    const current = historyIndex >= 0 ? historyIndex : history.length - 1
    const target = findValidSnapshotIndexForward(current + 1)
    if (target === -1) return
    const entry = history[target]
    if (entry.snapshot) {
      await restoreSnapshot(entry.snapshot)
      setHistoryIndex(target)
    }
  }, [history, historyIndex])

  React.useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z'
      const isRedo = (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'
      if (isUndo) {
        e.preventDefault()
        handleUndo()
      } else if (isRedo) {
        e.preventDefault()
        handleRedo()
      } else if (isSave) {
        e.preventDefault()
        addTimeline('快捷键保存')
      }
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [handleUndo, handleRedo, addTimeline])

  const handleSelectTool = (tool: EditorTool) => {
    setActiveTool(tool)
    if (tool === 'crop') addTimeline('切换到裁剪工具')
    else if (tool === 'filter') addTimeline('切换到滤镜工具')
    else if (tool === 'draw') addTimeline('切换到绘图工具')
    else if (tool === 'text') addTimeline('切换到文本工具')
    else addTimeline('关闭工具')
  }

  const handleReset = () => {
    resetHistory()
    setActiveTool(null)
    setFilterState({ brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sharpen: 0 })
    setFileName(null)
    setTimeline([])
    setHistory([])
    setHistoryIndex(-1)
    addTimeline('已重置编辑器与历史')
  }

  const handleExport = React.useCallback(async () => {
    const renderer = getRenderer()
    if (!renderer) {
      console.warn('无法导出：renderer未初始化')
      return
    }
    try {
      const { exportImage } = await import('../../services/file.service')
      await exportImage(renderer, fileName || '图像编辑器.png')
      addTimeline('导出图像')
    } catch (error) {
      console.error('导出失败:', error)
    }
  }, [fileName, addTimeline])

  const handleFileSelect = React.useCallback(async (file: File) => {
    const renderer = getRenderer()
    if (!renderer) {
      console.warn('无法加载图像：renderer未初始化')
      return
    }
    try {
      setFileName(file.name)
      await renderer.loadImage(file)
      const sizes = mapRendererLayersToUI(renderer.state.layers)
      setLayers(sizes)
      if (sizes.length > 0) {
        setActiveLayerId(sizes[sizes.length - 1].id)
      }
      renderer.fitToView()
      addTimeline(`上传图片：${file.name}`)
    } catch (error) {
      console.error('加载图像失败:', error)
    }
  }, [addTimeline])

  const renderer = getRenderer()
  const canvasSize = renderer?.state.imgSize
  const zoom = renderer ? Math.round(renderer.state.zoom * 100) : 100

  return (
    <div className="editor-container" style={{ height: '100vh', overflow: 'hidden' }}>
      <EditorLayout
        activeTool={activeTool}
        onSelectTool={handleSelectTool}
        filterState={filterState}
        onFilterChange={(next) => {
          setFilterState(next)
          const now = Date.now()
          if (now - filterLogGate.current > 1500) {
            addTimeline('调整滤镜')
            filterLogGate.current = now
          }
        }}
        fileName={fileName}
        onFileNameChange={setFileName}
        timeline={timeline}
        onTimeline={addTimeline}
        onTimelineClick={handleTimelineClick}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={findValidSnapshotIndexBackward((historyIndex >= 0 ? historyIndex : history.length - 1) - 1) !== -1}
        canRedo={findValidSnapshotIndexForward((historyIndex >= 0 ? historyIndex : history.length - 1) + 1) !== -1}
        rendererRef={rendererRef}
        layers={layers}
        activeLayerId={activeLayerId}
        onActiveLayerChange={(id) => {
          setActiveLayerId(id)
          if (id) addTimeline(`选择图层：${id}`)
        }}
        onLayersChange={setLayers}
        textLayerMetadata={textLayerMetadata}
        onTextLayerMetadataChange={setTextLayerMetadata}
        onUpdateTextLayer={async (layerId: string, config: Omit<TextLayer, 'id' | 'x' | 'y'>) => {
          const renderer = getRenderer()
          if (!renderer) return
          try {
            const { updateTextLayer } = await import('../../features/text/text.service')
            const layer = renderer.getLayer(layerId)
            if (layer) {
              // 更新文本图层，直接获取新图层 ID
              const newLayerId = await updateTextLayer(renderer, layerId, {
                ...config,
                x: 0, // 这些值会被updateTextLayer内部计算
                y: 0
              })
              
              // 更新元数据映射（使用新图层ID）
              setTextLayerMetadata((prev) => {
                const newMetadata = { ...prev }
                delete newMetadata[layerId]
                newMetadata[newLayerId] = config
                return newMetadata
              })
              
              // 如果更新的是当前选中的图层，更新activeLayerId
              if (layerId === activeLayerId) {
                setActiveLayerId(newLayerId)
              }
              
              // 同步图层列表
              const updatedLayers = mapRendererLayersToUI(renderer.state.layers)
              setLayers(updatedLayers)
              
              addTimeline(`更新文本：${config.text}`)
            }
          } catch (error) {
            console.error('更新文本图层失败:', error)
          }
        }}
        onTextLayerCreated={(layerId: string, config: Omit<TextLayer, 'id' | 'x' | 'y'>) => {
          setTextLayerMetadata((prev) => ({ ...prev, [layerId]: config }))
        }}
        onTextLayerIdUpdate={(oldLayerId: string, newLayerId: string) => {
          // 当CanvasStage检测到文本图层ID变化时，同步更新元数据映射
          // 这确保了编辑状态的连贯性
          setTextLayerMetadata((prev) => {
            const newMetadata = { ...prev }
            if (newMetadata[oldLayerId]) {
              newMetadata[newLayerId] = newMetadata[oldLayerId]
              delete newMetadata[oldLayerId]
            }
            return newMetadata
          })
          // 如果旧图层ID是当前选中的图层，更新activeLayerId
          if (oldLayerId === activeLayerId) {
            setActiveLayerId(newLayerId)
          }
        }}
        onExport={handleExport}
        onReset={handleReset}
        canvasSize={canvasSize ? { width: canvasSize.w, height: canvasSize.h } : undefined}
        zoom={zoom}
        onFileSelect={handleFileSelect}
      />
    </div>
  )
}
