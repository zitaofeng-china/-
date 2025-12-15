/**
 * 统一类型定义导出
 * 集中管理所有类型定义，方便维护和使用
 */

// 工具相关类型（先导出，避免循环依赖）
export type { TextLayer, DrawPoint, DrawStroke, CropRect, FilterState } from './tool'
// 编辑器相关类型
export type {
  EditorTool,
  TimelineEntry,
  EditorSnapshot,
  LayerSnapshot,
  TextLayerMetadata,
  CanvasStageRef,
  RendererRef
} from './editor'
// 图像相关类型
export type { ImageMeta } from './image'
// 图层相关类型
export type { UILayer } from './layer'
// 服务相关类型
export type { ExifData, CompressOptions, HistoryEntry, LoadedImage } from './service'
// Canvas 引擎类型（重新导出）
export type { Renderer, Layer as RendererLayer, Vec2 } from '../canvas/engine'

