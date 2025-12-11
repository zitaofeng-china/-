/**
 * 编辑器主页面组件
 * 图像编辑器的入口页面，管理编辑器的整体状态和工具切换
 */
// src/pages/Editor/index.tsx
import React, { useState } from 'react'
import { EditorLayout } from './EditorLayout'
import { resetHistory } from '../../features/history/history.service'
import type { TextLayer } from '../../features/text/text.service'

type Tool = 'crop' | 'filter' | 'draw' | 'text' | null

// 时间线条目类型，包含状态快照
export type TimelineEntry = {
  id: string
  text: string
  ts: number
  snapshot?: EditorSnapshot
}

// 编辑器状态快照
export type EditorSnapshot = {
  filterState: { brightness: number; contrast: number; saturation: number }
  layers: LayerSnapshot[]
  activeLayerId: string | null
  fileName: string | null
  viewState: { zoom: number; offset: { x: number; y: number } }
}

// 图层状态快照（不包含bitmap，因为bitmap不能序列化）
export type LayerSnapshot = {
  id: string
  name: string
  offset: { x: number; y: number }
  visible: boolean
  scale: number
  rotation: number
}

// 文本图层元数据存储（图层ID -> 文本属性）
type TextLayerMetadata = {
  [layerId: string]: Omit<TextLayer, 'id' | 'x' | 'y'>
}

export default function Editor() {
  const [activeTool, setActiveTool] = useState<Tool>(null)
  const [filterState, setFilterState] = useState({ brightness: 100, contrast: 100, saturation: 100 })
  const [fileName, setFileName] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [layers, setLayers] = useState<{ id: string; name: string; w: number; h: number; visible?: boolean }[]>([])
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [textLayerMetadata, setTextLayerMetadata] = useState<TextLayerMetadata>({})
  const filterLogGate = React.useRef(0)
  const rendererRef = React.useRef<any>(null) // 用于保存renderer引用

  // 创建状态快照
  const createSnapshot = (): EditorSnapshot | null => {
    const renderer = rendererRef.current?.current?.getRenderer?.()
    
    // 即使没有renderer，也创建一个基本快照（用于记录状态）
    if (!renderer) {
      return {
        filterState: { ...filterState },
        layers: [],
        activeLayerId,
        fileName,
        viewState: {
          zoom: 1,
          offset: { x: 0, y: 0 }
        }
      }
    }

    const layers = renderer.getLayers()
    return {
      filterState: { ...filterState },
      layers: layers.map((layer: any) => ({
        id: layer.id,
        name: layer.name,
        offset: { ...layer.offset },
        visible: layer.visible,
        scale: layer.scale,
        rotation: layer.rotation
      })),
      activeLayerId,
      fileName,
      viewState: {
        zoom: renderer.state.zoom,
        offset: { ...renderer.state.offset }
      }
    }
  }

  // 恢复状态快照
  const restoreSnapshot = (snapshot: EditorSnapshot) => {
    const renderer = rendererRef.current?.current?.getRenderer?.()
    if (!renderer) {
      console.warn('无法恢复：renderer未初始化')
      // 即使没有renderer，也恢复可以恢复的状态
      setFilterState(snapshot.filterState)
      setActiveLayerId(snapshot.activeLayerId)
      setFileName(snapshot.fileName)
      return
    }

    try {
      // 恢复滤镜状态
      setFilterState(snapshot.filterState)
      renderer.setFilter(snapshot.filterState)

      // 恢复图层状态
      let restoredCount = 0
      snapshot.layers.forEach((layerSnapshot) => {
        const layer = renderer.getLayer(layerSnapshot.id)
        if (layer) {
          renderer.setLayerOffset(layerSnapshot.id, layerSnapshot.offset)
          renderer.setLayerVisibility(layerSnapshot.id, layerSnapshot.visible)
          renderer.setLayerScale(layerSnapshot.id, layerSnapshot.scale)
          renderer.setLayerRotation(layerSnapshot.id, layerSnapshot.rotation)
          restoredCount++
        } else {
          console.warn(`图层 ${layerSnapshot.id} (${layerSnapshot.name}) 不存在，无法恢复`)
        }
      })

      // 恢复视图状态
      renderer.setView({
        zoom: snapshot.viewState.zoom,
        offset: snapshot.viewState.offset
      })

      // 恢复其他状态
      setActiveLayerId(snapshot.activeLayerId)
      setFileName(snapshot.fileName)

      // 触发图层同步（通过触发一个小的状态更新）
      const currentLayers = renderer.getLayers()
      setLayers(currentLayers.map((l: any) => ({
        id: l.id,
        name: l.name,
        w: l.bitmap.width,
        h: l.bitmap.height,
        visible: l.visible
      })))

      console.log(`恢复完成：${restoredCount}/${snapshot.layers.length} 个图层已恢复`)
    } catch (error) {
      console.error('恢复状态时出错:', error)
    }
  }

  const addTimeline = (text: string, saveSnapshot: boolean = true) => {
    // 确保时间线记录总是被创建，即使快照创建失败
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
          activeLayerId,
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
    
    setTimeline((prev) => {
      const newTimeline = [...prev, entry]
      // 保持最多40条记录
      return newTimeline.slice(-40)
    })
    
    // 调试信息
    console.log('时间线记录已添加:', text, '快照:', snapshot ? '有' : '无')
  }

  const handleTimelineClick = (entry: TimelineEntry) => {
    if (entry.snapshot) {
      console.log('开始恢复状态:', entry.text, entry.snapshot)
      restoreSnapshot(entry.snapshot)
      addTimeline(`恢复到：${entry.text}`, false) // 恢复操作不保存快照，避免循环
    } else {
      console.warn('此记录没有快照，无法恢复:', entry.text)
    }
  }

  const handleSelectTool = (tool: Tool) => {
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
    setFilterState({ brightness: 100, contrast: 100, saturation: 100 })
    setFileName(null)
    setTimeline([])
    addTimeline('已重置编辑器与历史')
  }

  return (
    <div className="min-h-screen bg-slate-100">
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
          const renderer = rendererRef.current?.current?.getRenderer?.()
          if (!renderer) return
          try {
            const { updateTextLayer } = await import('../../features/text/text.service')
            const layer = renderer.getLayer(layerId)
            if (layer) {
              // 更新文本图层（updateTextLayer内部会处理位置和属性）
              await updateTextLayer(renderer, layerId, {
                ...config,
                x: 0, // 这些值会被updateTextLayer内部计算
                y: 0
              })
              
              // 找到新创建的图层（通过名称匹配，因为updateTextLayer会创建新图层）
              const newLayer = renderer.getLayers().find((l: any) => 
                l.name.startsWith('Text:') && l.name.includes(config.text.substring(0, Math.min(10, config.text.length)))
              )
              
              if (newLayer) {
                // 更新元数据映射（使用新图层ID）
                setTextLayerMetadata((prev) => {
                  const newMetadata = { ...prev }
                  delete newMetadata[layerId]
                  newMetadata[newLayer.id] = config
                  return newMetadata
                })
                
                // 如果更新的是当前选中的图层，更新activeLayerId
                if (layerId === activeLayerId) {
                  setActiveLayerId(newLayer.id)
                }
              } else {
                // 如果找不到新图层，保持原有映射
                setTextLayerMetadata((prev) => ({ ...prev, [layerId]: config }))
              }
              
              // 同步图层列表
              const updatedLayers = renderer.getLayers().map((l: any) => ({
                id: l.id,
                name: l.name,
                w: l.bitmap.width,
                h: l.bitmap.height,
                visible: l.visible
              }))
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
      />
    </div>
  )
}
