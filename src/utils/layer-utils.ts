/**
 * 图层工具函数
 * 提供图层相关的工具函数，避免代码重复
 */
import type { RendererLayer } from '../types'
import type { UILayer } from '../types/layer'

/**
 * 将渲染器的图层数组映射为 UI 图层格式
 * @param layers 渲染器的图层数组
 * @returns UI 图层数组
 */
export function mapRendererLayersToUI(layers: RendererLayer[]): UILayer[] {
  return layers.map((l) => ({
    id: l.id,
    name: l.name,
    w: l.bitmap.width,
    h: l.bitmap.height,
    visible: l.visible
  }))
}

/**
 * 检查图层是否可见
 * 统一处理 undefined 的情况，将 undefined 视为可见
 * @param visible 图层的可见性属性
 * @returns 是否可见
 */
export function isLayerVisible(visible: boolean | undefined): boolean {
  return visible !== false
}

