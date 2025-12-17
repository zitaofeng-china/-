/**
 * 编辑器类型定义
 * 定义编辑器相关的类型，包括工具类型、快照类型等
 */
import type { Renderer } from '../canvas/engine'
import type { TextLayer } from './tool'

/**
 * 编辑器工具类型
 */
export type EditorTool = 'crop' | 'filter' | 'draw' | 'text' | null

/**
 * 时间线条目类型，包含状态快照
 */
export type TimelineEntry = {
  id: string
  text: string
  ts: number
  snapshot?: EditorSnapshot
}

/**
 * 编辑器状态快照（包含位图数据）
 */
export type EditorSnapshot = {
  filterState: { brightness: number; contrast: number; saturation: number; hue: number; blur: number; sharpen: number }
  layers: LayerSnapshot[]
  activeLayerIndex: number
  fileName: string | null
  viewState: { zoom: number; offset: { x: number; y: number } }
}

/**
 * 图层状态快照，包含序列化位图
 */
export type LayerSnapshot = {
  name: string
  offset: { x: number; y: number }
  visible: boolean
  scale: number
  rotation: number
  opacity: number
  blendMode: GlobalCompositeOperation
  locked: boolean
  bitmapDataUrl: string
  isTextLayer?: boolean
  textConfig?: Omit<TextLayer, 'id' | 'x' | 'y'>
}

/**
 * 文本图层元数据存储（图层ID -> 文本属性）
 */
export type TextLayerMetadata = {
  [layerId: string]: Omit<TextLayer, 'id' | 'x' | 'y'>
}

/**
 * CanvasStage 组件的 ref 类型
 */
export type CanvasStageRef = {
  getRenderer: () => Renderer | null
  handleDrawConfig?: (color: string, size: number) => void
  handleAddText?: (config: Omit<TextLayer, 'id' | 'x' | 'y'>) => void
  handleCropConfirm?: () => void
  handleLayerDelete?: (id: string) => void
  handleLayerVisibilityToggle?: (id: string, visible: boolean) => void
  handleLayerMove?: (id: string, direction: 'up' | 'down') => void
  handleLayerDuplicate?: (id: string) => void
  handleLayerRename?: (id: string, name: string) => void
  handleLayerAlignCenter?: (id: string) => void
  handleLayerScaleChange?: (id: string, scale: number) => void
  handleLayerScaleChangeEnd?: (id: string, scale: number) => void
  handleLayerRotationChange?: (id: string, rotation: number) => void
  handleLayerRotationChangeEnd?: (id: string, rotation: number) => void
  handleLayerOpacityChange?: (id: string, opacity: number) => void
  handleLayerBlendModeChange?: (id: string, blendMode: GlobalCompositeOperation) => void
  handleLayerLockedChange?: (id: string, locked: boolean) => void
  handleAddLayer?: () => void
  getCrop?: () => { x: number; y: number; w: number; h: number; rotation: number } | null
  setCrop?: (crop: { x: number; y: number; w: number; h: number; rotation: number }) => void
}

/**
 * Renderer Ref 类型（用于 useRenderer Hook）
 */
export type RendererRef = React.MutableRefObject<{
  getRenderer: () => Renderer | null
  getCrop?: () => { x: number; y: number; w: number; h: number; rotation: number } | null
  setCrop?: (crop: { x: number; y: number; w: number; h: number; rotation: number }) => void
} | null>
