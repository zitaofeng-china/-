/**
 * 滤镜服务
 * 提供图像滤镜效果应用的核心逻辑
 */
import type { Renderer } from '../../canvas/engine'

// ==================== 类型定义 ====================

export type FilterState = {
  brightness: number
  contrast: number
  saturation: number
}

// ==================== 函数实现 ====================

/**
 * 应用滤镜效果
 * @param renderer Canvas渲染器实例
 * @param filter 滤镜状态对象
 */
export function applyFilter(renderer: Renderer, filter: FilterState): void {
  renderer.setFilter(filter)
}

/**
 * 重置滤镜到默认值
 * @returns 默认滤镜状态
 */
export function getDefaultFilter(): FilterState {
  return {
    brightness: 100,
    contrast: 100,
    saturation: 100
  }
}

/**
 * 验证滤镜值是否在有效范围内
 * @param filter 滤镜状态
 * @returns 是否有效
 */
export function validateFilter(filter: FilterState): boolean {
  const { brightness, contrast, saturation } = filter
  return (
    brightness >= 0 &&
    brightness <= 200 &&
    contrast >= 0 &&
    contrast <= 200 &&
    saturation >= 0 &&
    saturation <= 200
  )
}

