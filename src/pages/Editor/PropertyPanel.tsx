/**
 * 属性面板组件
 * 显示当前选中工具的属性配置和编辑器状态信息，包括图层列表和时间线
 */
import React, { useState, useMemo } from 'react'

import Slider from '../../components/ui/Slider'
import { CropTool } from '../../features/crop/CropTool'
import { DrawTool } from '../../features/draw/DrawTool'
import { FilterTool } from '../../features/filter/FilterTool'
import { TextTool } from '../../features/text/TextTool'
import type { Renderer } from '../../canvas/engine'
import type { TextLayer } from '../../features/text/text.service'
import type { EditorSnapshot, TextLayerMetadata } from './index'

type Props = {
  activeTool: 'crop' | 'filter' | 'draw' | 'text' | null
  filterState: { brightness: number; contrast: number; saturation: number; hue: number; blur: number; sharpen: number }
  onFilterChange: (next: { brightness: number; contrast: number; saturation: number; hue: number; blur: number; sharpen: number }) => void
  onSelectTool: (tool: 'crop' | 'filter' | 'draw' | 'text' | null) => void
  fileName: string | null
  timeline: { id: string; text: string; ts: number; snapshot?: EditorSnapshot }[]
  onTimeline: (text: string) => void
  onTimelineClick?: (entry: { id: string; text: string; ts: number; snapshot?: EditorSnapshot }) => void
  rendererRef?: React.MutableRefObject<{ 
    getRenderer: () => Renderer | null
    getCrop?: () => { x: number; y: number; w: number; h: number; rotation: number } | null
    setCrop?: (crop: { x: number; y: number; w: number; h: number; rotation: number }) => void
  } | null>
  layers?: { id: string; name: string; w: number; h: number; visible?: boolean }[]
  activeLayerId?: string | null
  onActiveLayerChange?: (id: string | null) => void
  onCropConfirm?: () => void
  onDrawConfig?: (color: string, size: number) => void
  onAddText?: (config: Omit<TextLayer, 'id' | 'x' | 'y'>) => void
  onLayerDelete?: (id: string) => void
  onLayerVisibilityToggle?: (id: string, visible: boolean) => void
  onLayerMove?: (id: string, direction: 'up' | 'down') => void
  onLayerDuplicate?: (id: string) => void
  onLayerScaleChange?: (id: string, scale: number) => void
  onLayerScaleChangeEnd?: (id: string, scale: number) => void
  onLayerRotationChange?: (id: string, rotation: number) => void
  onLayerRotationChangeEnd?: (id: string, rotation: number) => void
  renderer?: Renderer | null
  textLayerMetadata?: TextLayerMetadata
  onTextLayerMetadataChange?: (metadata: TextLayerMetadata) => void
  onUpdateTextLayer?: (layerId: string, config: Omit<TextLayer, 'id' | 'x' | 'y'>) => Promise<void>
}

type TabKey = 'adjust' | 'filter' | 'layers' | 'history'

export function PropertyPanel({
  activeTool,
  filterState,
  onFilterChange,
  onSelectTool,
  fileName,
  timeline,
  onTimeline,
  onTimelineClick,
  rendererRef,
  layers = [],
  activeLayerId,
  onActiveLayerChange,
  onCropConfirm,
  onDrawConfig,
  onAddText,
  onLayerDelete,
  onLayerVisibilityToggle,
  onLayerMove,
  onLayerDuplicate,
  onLayerScaleChange,
  onLayerScaleChangeEnd,
  onLayerRotationChange,
  onLayerRotationChangeEnd,
  renderer,
  textLayerMetadata = {},
  onTextLayerMetadataChange,
  onUpdateTextLayer
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('adjust')
  const activeLayer = activeLayerId && renderer ? renderer.getLayer(activeLayerId) : null
  const isTextLayer = activeLayer && activeLayer.name.startsWith('Text:')
  const activeTextMetadata = activeLayerId && isTextLayer ? textLayerMetadata[activeLayerId] : null

  // 滤镜预设配置（移到组件顶层，避免 Hooks 规则违反）
  const filterPresets = useMemo(() => [
    { 
      id: 'original', 
      name: '原始', 
      config: { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sharpen: 0 }
    },
    { 
      id: 'vivid', 
      name: '鲜艳', 
      config: { brightness: 105, contrast: 120, saturation: 130, hue: 0, blur: 0, sharpen: 0 }
    },
    { 
      id: 'warm', 
      name: '温暖', 
      config: { brightness: 110, contrast: 105, saturation: 110, hue: 15, blur: 0, sharpen: 0 }
    },
    { 
      id: 'cool', 
      name: '冷色', 
      config: { brightness: 105, contrast: 110, saturation: 105, hue: -15, blur: 0, sharpen: 0 }
    },
    { 
      id: 'vintage', 
      name: '复古', 
      config: { brightness: 95, contrast: 90, saturation: 85, hue: 25, blur: 0, sharpen: 0 }
    },
    { 
      id: 'bw', 
      name: '黑白', 
      config: { brightness: 100, contrast: 110, saturation: 0, hue: 0, blur: 0, sharpen: 0 }
    },
    { 
      id: 'dramatic', 
      name: '戏剧', 
      config: { brightness: 90, contrast: 130, saturation: 120, hue: 0, blur: 0, sharpen: 10 }
    },
    { 
      id: 'fade', 
      name: '褪色', 
      config: { brightness: 110, contrast: 85, saturation: 80, hue: 0, blur: 0, sharpen: 0 }
    }
  ], [])

  // 生成滤镜预览缩略图（使用 useMemo 缓存）
  const filterPreviews = useMemo(() => {
    const previews: Record<string, string> = {}
    
    filterPresets.forEach((filter) => {
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // 先绘制到临时画布
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = 100
      tempCanvas.height = 100
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) return

      // 绘制预览图案（天空、太阳、地面）
      tempCtx.fillStyle = '#4a90e2'
      tempCtx.fillRect(0, 0, 100, 100)
      
      // 太阳
      tempCtx.fillStyle = '#f5a623'
      tempCtx.beginPath()
      tempCtx.arc(50, 30, 15, 0, Math.PI * 2)
      tempCtx.fill()
      
      // 地面
      tempCtx.fillStyle = '#7ed321'
      tempCtx.beginPath()
      tempCtx.moveTo(20, 70)
      tempCtx.lineTo(50, 50)
      tempCtx.lineTo(80, 70)
      tempCtx.lineTo(80, 100)
      tempCtx.lineTo(20, 100)
      tempCtx.closePath()
      tempCtx.fill()

      // 应用滤镜效果到主画布
      const { brightness, contrast, saturation, hue, blur, sharpen } = filter.config
      const filters: string[] = []
      if (brightness !== 100) filters.push(`brightness(${brightness}%)`)
      const effectiveContrast = sharpen > 0 
        ? contrast + (sharpen / 100) * 20 
        : contrast
      if (effectiveContrast !== 100) filters.push(`contrast(${effectiveContrast}%)`)
      if (saturation !== 100) filters.push(`saturate(${saturation}%)`)
      if (hue !== 0) filters.push(`hue-rotate(${hue}deg)`)
      if (blur > 0) filters.push(`blur(${blur}px)`)
      
      if (filters.length > 0) {
        ctx.filter = filters.join(' ')
      }
      
      // 将临时画布绘制到主画布（应用滤镜）
      ctx.drawImage(tempCanvas, 0, 0)
      ctx.filter = 'none'

      previews[filter.id] = canvas.toDataURL()
    })

    return previews
  }, [filterPresets])

  // 调整面板内容
  const renderAdjustPanel = () => {
    const adjustState = {
      brightness: filterState.brightness - 100,
      contrast: filterState.contrast - 100,
      saturation: filterState.saturation - 100,
      hue: filterState.hue,
      blur: filterState.blur,
      sharpen: filterState.sharpen
    }

    const updateAdjust = (key: string, value: number) => {
      if (key === 'brightness') {
        onFilterChange({ ...filterState, brightness: value + 100 })
      } else if (key === 'contrast') {
        onFilterChange({ ...filterState, contrast: value + 100 })
      } else if (key === 'saturation') {
        onFilterChange({ ...filterState, saturation: value + 100 })
      } else if (key === 'hue') {
        // 色调范围：-180 到 180，滑块显示：0 到 360
        onFilterChange({ ...filterState, hue: value - 180 })
      } else if (key === 'blur') {
        onFilterChange({ ...filterState, blur: value })
      } else if (key === 'sharpen') {
        onFilterChange({ ...filterState, sharpen: value })
      }
    }

  return (
      <div className="property-panel-content">
        <h3 className="property-panel-title">调整</h3>
        <div className="property-controls">
          <div className="property-control-item">
            <div className="property-control-label">
              <span>亮度</span>
              <span className="property-control-value">{adjustState.brightness}</span>
            </div>
            <Slider
              value={adjustState.brightness + 100}
              min={0}
              max={200}
              onChange={(v) => updateAdjust('brightness', v - 100)}
            />
          </div>
          <div className="property-control-item">
            <div className="property-control-label">
              <span>对比度</span>
              <span className="property-control-value">{adjustState.contrast}</span>
            </div>
            <Slider
              value={adjustState.contrast + 100}
              min={0}
              max={200}
              onChange={(v) => updateAdjust('contrast', v - 100)}
            />
          </div>
          <div className="property-control-item">
            <div className="property-control-label">
              <span>饱和度</span>
              <span className="property-control-value">{adjustState.saturation}</span>
            </div>
            <Slider
              value={adjustState.saturation + 100}
              min={0}
              max={200}
              onChange={(v) => updateAdjust('saturation', v - 100)}
            />
          </div>
          <div className="property-control-item">
            <div className="property-control-label">
              <span>色调</span>
              <span className="property-control-value">{adjustState.hue}</span>
            </div>
            <Slider
              value={adjustState.hue + 180}
              min={0}
              max={360}
              onChange={(v) => updateAdjust('hue', v)}
            />
          </div>
          <div className="property-control-item">
            <div className="property-control-label">
              <span>模糊</span>
              <span className="property-control-value">{adjustState.blur}</span>
            </div>
            <Slider
              value={adjustState.blur}
              min={0}
              max={100}
              onChange={(v) => updateAdjust('blur', v)}
            />
          </div>
          <div className="property-control-item">
            <div className="property-control-label">
              <span>锐化</span>
              <span className="property-control-value">{adjustState.sharpen}</span>
            </div>
            <Slider
              value={adjustState.sharpen}
              min={0}
              max={100}
              onChange={(v) => updateAdjust('sharpen', v)}
            />
          </div>
        </div>
        <div className="property-actions">
          <button className="property-button" onClick={() => onFilterChange({ brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sharpen: 0 })}>
            重置
          </button>
        </div>
      </div>
    )
  }

  // 滤镜面板内容
  const renderFilterPanel = () => {

    return (
      <div className="property-panel-content">
        <h3 className="property-panel-title">滤镜</h3>
        <div className="filter-grid">
          {filterPresets.map((filter) => {
            const previewUrl = filterPreviews[filter.id]
            return (
              <button
                key={filter.id}
                className="filter-item"
                onClick={() => {
                  onFilterChange(filter.config)
                  onTimeline(`应用滤镜: ${filter.name}`)
                }}
              >
                <div className="filter-preview">
                  {previewUrl ? (
                    <img src={previewUrl} alt={filter.name} className="filter-preview-image" />
                  ) : (
                    <svg viewBox="0 0 100 100" className="filter-icon">
                      <rect width="100" height="100" fill="#4a90e2" />
                      <circle cx="50" cy="30" r="15" fill="#f5a623" />
                      <path d="M20 70 L50 50 L80 70 L80 100 L20 100 Z" fill="#7ed321" />
                    </svg>
                  )}
                </div>
                <span className="filter-name">{filter.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 图层面板内容
  const renderLayersPanel = () => {
    return (
      <div className="property-panel-content">
        <div className="property-panel-header">
          <h3 className="property-panel-title">图层</h3>
          <button className="property-icon-button" title="添加图层">+</button>
        </div>
        <div className="layers-list">
          {layers.length === 0 && (
            <div className="layers-empty">暂无图层</div>
          )}
          {layers.slice().reverse().map((l, reverseIdx) => {
            const idx = layers.length - 1 - reverseIdx
            const isVisible = l.visible !== false
            const isActive = l.id === activeLayerId
            return (
              <div
                key={l.id}
                className={`layer-item ${isActive ? 'active' : ''} ${!isVisible ? 'hidden' : ''}`}
                onClick={() => onActiveLayerChange?.(l.id)}
              >
                <div className="layer-header">
                  <span className="layer-icon">○</span>
                  <div className="layer-info">
                    <div className="layer-name">{l.name}</div>
                    <div className="layer-size">{l.w} × {l.h}</div>
                  </div>
                  {isActive && <span className="layer-lock">🔒</span>}
                </div>
                {isActive && activeLayer && (
                  <div className="layer-properties">
                    <div className="layer-property">
                      <span>不透明度:</span>
                      <div className="layer-property-control">
                        <Slider
                          value={100}
                          min={0}
                          max={100}
                          onChange={() => {}}
                        />
                        <span className="layer-property-value">100%</span>
                      </div>
                    </div>
                    <div className="layer-property">
                      <span>混合模式:</span>
                      <select className="layer-blend-mode" defaultValue="normal">
                        <option value="normal">Normal</option>
                        <option value="multiply">Multiply</option>
                        <option value="screen">Screen</option>
                        <option value="overlay">Overlay</option>
                      </select>
                    </div>
                  </div>
                )}
                <div className="layer-actions">
                  <button className="layer-action-button" onClick={(e) => {
                      e.stopPropagation()
                      onLayerDuplicate?.(l.id)
                  }} title="复制">📋</button>
                  <button className="layer-action-button" onClick={(e) => {
                      e.stopPropagation()
                        onLayerDelete?.(l.id)
                  }} title="删除">🗑</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // 历史面板内容
  const renderHistoryPanel = () => {
    return (
      <div className="property-panel-content">
        <h3 className="property-panel-title">历史</h3>
        <div className="history-list">
          {timeline.length === 0 && (
            <div className="history-empty">暂无历史记录</div>
          )}
          {timeline.slice().reverse().map((item) => (
            <div
              key={item.id}
              className={`history-item ${item.snapshot ? 'restorable' : ''}`}
              onClick={() => {
                if (item.snapshot && onTimelineClick) {
                  onTimelineClick(item)
                }
              }}
            >
              <div className="history-text">{item.text}</div>
              <div className="history-time">{new Date(item.ts).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 根据工具类型渲染不同的内容
  const renderToolContent = () => {
    // 选择工具（null）时显示标签页内容
    if (activeTool === null) {
      return (
        <>
          {/* 标签页 */}
          <div className="property-tabs">
            <button
              className={`property-tab ${activeTab === 'adjust' ? 'active' : ''}`}
              onClick={() => setActiveTab('adjust')}
            >
              调整
            </button>
            <button
              className={`property-tab ${activeTab === 'filter' ? 'active' : ''}`}
              onClick={() => setActiveTab('filter')}
            >
              滤镜
            </button>
            <button
              className={`property-tab ${activeTab === 'layers' ? 'active' : ''}`}
              onClick={() => setActiveTab('layers')}
            >
              图层
            </button>
            <button
              className={`property-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              历史
            </button>
          </div>

          {/* 面板内容 */}
          <div className="property-panel-body">
            {activeTab === 'adjust' && renderAdjustPanel()}
            {activeTab === 'filter' && renderFilterPanel()}
            {activeTab === 'layers' && renderLayersPanel()}
            {activeTab === 'history' && renderHistoryPanel()}
          </div>
        </>
      )
    }

    // 裁剪工具
    if (activeTool === 'crop') {
      const renderer = rendererRef?.current?.getRenderer?.() || null
      const crop = rendererRef?.current?.getCrop?.() || null
      const imgSize = renderer?.state.imgSize || { w: 0, h: 0 }
      const imageSize = { width: imgSize.w, height: imgSize.h }
      
      return (
        <div className="property-panel-body">
          <div className="property-panel-content">
            <CropTool
              onConfirm={onCropConfirm}
              onCancel={() => onSelectTool(null)}
              crop={crop}
              onCropChange={(newCrop) => {
                rendererRef?.current?.setCrop?.(newCrop)
              }}
              imageSize={imageSize}
            />
          </div>
        </div>
      )
    }

    // 画笔工具
    if (activeTool === 'draw') {
      return (
        <div className="property-panel-body">
          <div className="property-panel-content">
            <DrawTool
              onDrawStart={onDrawConfig}
              onDrawEnd={() => {}}
            />
                </div>
              </div>
      )
    }

    // 文字工具
    if (activeTool === 'text') {
      return (
        <div className="property-panel-body">
          <div className="property-panel-content">
            <TextTool
              onAddText={onAddText}
              onChange={activeTextMetadata && activeLayerId ? (config) => {
                onUpdateTextLayer?.(activeLayerId, config)
              } : undefined}
              initialConfig={activeTextMetadata || undefined}
              isEditMode={!!activeTextMetadata}
            />
          </div>
        </div>
      )
    }

    // 滤镜工具 - 直接显示滤镜面板
    if (activeTool === 'filter') {
      return (
        <div className="property-panel-body">
          {renderFilterPanel()}
        </div>
      )
    }

    return null
  }

  return (
    <div className="property-panel">
      {renderToolContent()}
    </div>
  )
}
