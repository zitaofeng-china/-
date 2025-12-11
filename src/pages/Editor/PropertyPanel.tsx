/**
 * 属性面板组件
 * 显示当前选中工具的属性配置和编辑器状态信息，包括图层列表和时间线
 */
import React from 'react'
import { FilterTool } from '../../features/filter/FilterTool'
import { CropTool } from '../../features/crop/CropTool'
import { DrawTool } from '../../features/draw/DrawTool'
import { TextTool } from '../../features/text/TextTool'
import Slider from '../../components/ui/Slider'

type Props = {
  activeTool: 'crop' | 'filter' | 'draw' | 'text' | null
  filterState: { brightness: number; contrast: number; saturation: number }
  onFilterChange: (next: { brightness: number; contrast: number; saturation: number }) => void
  onSelectTool: (tool: 'crop' | 'filter' | 'draw' | 'text' | null) => void
  fileName: string | null
  timeline: { id: string; text: string; ts: number; snapshot?: any }[]
  onTimeline: (text: string) => void
  onTimelineClick?: (entry: { id: string; text: string; ts: number; snapshot?: any }) => void
  rendererRef?: React.MutableRefObject<any>
  layers?: { id: string; name: string; w: number; h: number; visible?: boolean }[]
  activeLayerId?: string | null
  onActiveLayerChange?: (id: string | null) => void
  onCropConfirm?: () => void
  onDrawConfig?: (color: string, size: number) => void
  onAddText?: (config: any) => void
  onLayerDelete?: (id: string) => void
  onLayerVisibilityToggle?: (id: string, visible: boolean) => void
  onLayerMove?: (id: string, direction: 'up' | 'down') => void
  onLayerDuplicate?: (id: string) => void
  onLayerScaleChange?: (id: string, scale: number) => void
  onLayerScaleChangeEnd?: (id: string, scale: number) => void
  onLayerRotationChange?: (id: string, rotation: number) => void
  onLayerRotationChangeEnd?: (id: string, rotation: number) => void
  renderer?: any
  textLayerMetadata?: { [layerId: string]: any }
  onTextLayerMetadataChange?: (metadata: { [layerId: string]: any }) => void
  onUpdateTextLayer?: (layerId: string, config: any) => Promise<void>
}

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
  const activeLayer = activeLayerId && renderer ? renderer.getLayer(activeLayerId) : null
  const isTextLayer = activeLayer && activeLayer.name.startsWith('Text:')
  const activeTextMetadata = activeLayerId && isTextLayer ? textLayerMetadata[activeLayerId] : null
  return (
    <div className="editor-panel-block">
      <h3>属性</h3>
      <div className="text-xs text-slate-500 mb-3">{fileName ?? '未加载图片'}</div>
      {activeTool === 'filter' ? (
        <FilterTool
          filter={filterState}
          onChange={onFilterChange}
          onCommit={() => onTimeline('调整滤镜')}
        />
      ) : activeTool === 'crop' ? (
        <CropTool onConfirm={onCropConfirm} />
      ) : activeTool === 'draw' ? (
        <DrawTool onDrawStart={onDrawConfig} />
      ) : null}
      <div className="mt-4">
        <div className="text-sm font-medium text-slate-700 mb-2 flex items-center justify-between">
          <span>图层 ({layers.length})</span>
        </div>
        <div className="max-h-64 overflow-auto space-y-1 text-xs">
          {layers.length === 0 && <div className="text-slate-400 text-center py-2">暂无图层</div>}
          {layers.slice().reverse().map((l, reverseIdx) => {
            const idx = layers.length - 1 - reverseIdx
            const isVisible = l.visible !== false
            return (
              <div
                key={l.id}
                className={`border rounded px-2 py-2 bg-white transition ${
                  l.id === activeLayerId
                    ? 'ring-2 ring-blue-500 border-blue-300'
                    : 'border-slate-200 hover:border-slate-300'
                } ${!isVisible ? 'opacity-50' : ''}`}
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => onActiveLayerChange?.(l.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onLayerVisibilityToggle?.(l.id, !isVisible)
                      }}
                      className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600"
                      title={isVisible ? '隐藏图层' : '显示图层'}
                    >
                      {isVisible ? '👁️' : '👁️‍🗨️'}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-700 truncate">
                        {layers.length - idx}. {l.name}
                      </div>
                      <div className="text-[10px] text-slate-400">{l.w} x {l.h}</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 mt-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onLayerMove?.(l.id, 'up')
                    }}
                    disabled={idx === layers.length - 1}
                    className="flex-1 px-2 py-1 text-[10px] rounded bg-slate-50 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="上移"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onLayerMove?.(l.id, 'down')
                    }}
                    disabled={idx === 0}
                    className="flex-1 px-2 py-1 text-[10px] rounded bg-slate-50 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="下移"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onLayerDuplicate?.(l.id)
                    }}
                    className="flex-1 px-2 py-1 text-[10px] rounded bg-slate-50 hover:bg-slate-100"
                    title="复制"
                  >
                    📋
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`确定要删除图层"${l.name}"吗？`)) {
                        onLayerDelete?.(l.id)
                        if (l.id === activeLayerId) {
                          const remainingLayers = layers.filter((layer) => layer.id !== l.id)
                          onActiveLayerChange?.(remainingLayers.length > 0 ? remainingLayers[remainingLayers.length - 1].id : null)
                        }
                      }
                    }}
                    className="flex-1 px-2 py-1 text-[10px] rounded bg-red-50 hover:bg-red-100 text-red-600"
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* 文字图层属性 - 当选中文字图层时显示，可随时编辑 */}
      {activeLayerId && isTextLayer && activeTextMetadata && (
        <div className="mt-4 border-t pt-4">
          <div className="text-sm font-medium text-slate-700 mb-3">文本属性</div>
          <TextTool
            initialConfig={activeTextMetadata}
            onChange={async (config) => {
              // 实时更新文字图层
              if (onUpdateTextLayer && activeLayerId) {
                await onUpdateTextLayer(activeLayerId, config)
              }
            }}
            onAddText={async (config) => {
              // 兼容旧接口
              if (onUpdateTextLayer && activeLayerId) {
                await onUpdateTextLayer(activeLayerId, config)
              }
            }}
            isEditMode={true}
          />
        </div>
      )}
      
      {/* 文字工具模式 - 当激活文字工具且未选中文字图层时显示 */}
      {activeTool === 'text' && (!isTextLayer || !activeTextMetadata) && (
        <div className="mt-4 border-t pt-4">
          <div className="text-sm font-medium text-slate-700 mb-3">添加文本</div>
          <TextTool
            onAddText={onAddText}
            isEditMode={false}
          />
        </div>
      )}

      {/* 图层变换控制 */}
      {activeLayerId && activeLayer && (
        <div className="mt-4 border-t pt-4">
          <div className="text-sm font-medium text-slate-700 mb-3">图层变换</div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600">缩放: {Math.round(activeLayer.scale * 100)}%</span>
              </div>
              <Slider
                value={activeLayer.scale * 100}
                min={10}
                max={500}
                step={1}
                onChange={(value) => {
                  onLayerScaleChange?.(activeLayerId, value / 100)
                }}
                onChangeEnd={() => {
                  onLayerScaleChangeEnd?.(activeLayerId, activeLayer.scale)
                }}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600">旋转: {Math.round(activeLayer.rotation)}°</span>
              </div>
              <Slider
                value={activeLayer.rotation}
                min={-180}
                max={180}
                step={1}
                onChange={(value) => {
                  onLayerRotationChange?.(activeLayerId, value)
                }}
                onChangeEnd={() => {
                  onLayerRotationChangeEnd?.(activeLayerId, activeLayer.rotation)
                }}
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-4">
        <div className="text-sm font-medium text-slate-700 mb-2 flex items-center justify-between">
          <span>时间线</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">({timeline.length} 条记录)</span>
            <button
              type="button"
              onClick={() => {
                onTimeline('手动保存状态')
              }}
              className="text-xs px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200"
              title="手动保存当前状态到时间线"
            >
              保存
            </button>
          </div>
        </div>
        <div className="max-h-48 overflow-auto space-y-1 text-xs text-slate-600">
          {timeline.length === 0 && <div className="text-slate-400 text-center py-2">暂无记录</div>}
          {timeline.length > 0 && timeline
            .slice()
            .reverse()
            .map((item) => (
              <div
                key={item.id}
                className={`border rounded px-2 py-1 bg-white transition cursor-pointer hover:bg-blue-50 hover:border-blue-300 ${
                  item.snapshot ? 'border-slate-200' : 'border-slate-200 opacity-60'
                }`}
                onClick={() => {
                  if (item.snapshot && onTimelineClick) {
                    onTimelineClick(item)
                  } else if (!item.snapshot) {
                    console.warn('此记录没有快照，无法恢复:', item.text)
                  }
                }}
                title={item.snapshot ? '点击恢复到此时的状态' : '此记录没有保存状态，无法恢复'}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div>{item.text}</div>
                    <div className="text-[10px] text-slate-400">{new Date(item.ts).toLocaleTimeString()}</div>
                  </div>
                  {item.snapshot && (
                    <div className="text-[10px] text-blue-500 ml-2" title="可恢复">↩️</div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

