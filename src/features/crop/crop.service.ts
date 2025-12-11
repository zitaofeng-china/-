/**
 * 裁剪服务
 * 提供图像裁剪功能的核心逻辑
 */
import type { Renderer } from '../../canvas/engine'

export type CropRect = {
  x: number
  y: number
  w: number
  h: number
  rotation: number
}

/**
 * 应用裁剪操作
 * @param renderer Canvas渲染器实例
 * @param cropRect 裁剪区域和旋转角度
 * @param targetLayerId 目标图层ID，如果不提供则裁剪最上层图层
 * @returns Promise<void>
 */
export async function cropImage(
  renderer: Renderer,
  cropRect: CropRect,
  targetLayerId?: string
): Promise<void> {
  if (renderer.state.layers.length === 0) {
    throw new Error('没有可裁剪的图像')
  }

  await renderer.applyCrop(cropRect, targetLayerId)
}

/**
 * 验证裁剪区域是否有效
 * @param cropRect 裁剪区域
 * @param imageWidth 图像宽度
 * @param imageHeight 图像高度
 * @param minSize 最小裁剪尺寸，默认32
 * @returns 是否有效
 */
export function validateCropRect(
  cropRect: CropRect,
  imageWidth: number,
  imageHeight: number,
  minSize: number = 32
): boolean {
  const { x, y, w, h } = cropRect

  // 检查尺寸
  if (w < minSize || h < minSize) {
    return false
  }

  // 检查边界
  if (x < 0 || y < 0 || x + w > imageWidth || y + h > imageHeight) {
    return false
  }

  return true
}

