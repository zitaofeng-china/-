/**
 * 绘图服务
 * 提供绘制笔画和图形的核心逻辑
 */
import type { Renderer } from '../../canvas/engine'

// ==================== 类型定义 ====================

export type Point = { x: number; y: number }

export type DrawStroke = {
  points: Point[]
  color: string
  size: number
}

// ==================== 函数实现 ====================

/**
 * 在指定图层上绘制笔画
 * 通过创建一个新的Canvas来绘制笔画，然后将其转换为ImageBitmap作为新图层
 * @param renderer Canvas渲染器实例
 * @param stroke 笔画数据
 * @param layerId 目标图层ID，如果不提供则在最上层绘制
 * @returns Promise<void>
 */
export async function drawStroke(
  renderer: Renderer,
  stroke: DrawStroke,
  layerId?: string
): Promise<void> {
  if (renderer.state.layers.length === 0) {
    throw new Error('没有可绘制的图层')
  }

  const targetLayer = layerId
    ? renderer.state.layers.find((l) => l.id === layerId)
    : renderer.state.layers[renderer.state.layers.length - 1]

  if (!targetLayer) {
    throw new Error('目标图层不存在')
  }

  // 将世界坐标（图像坐标）转换为图层本地坐标，考虑位移/缩放/旋转
  const toLocal = (pt: Point) => {
    const { offset, scale, rotation, bitmap } = targetLayer
    const centerX = offset.x + bitmap.width / 2
    const centerY = offset.y + bitmap.height / 2
    const dx = pt.x - centerX
    const dy = pt.y - centerY
    const rad = (-rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const rx = dx * cos - dy * sin
    const ry = dx * sin + dy * cos
    return {
      x: rx / scale + bitmap.width / 2,
      y: ry / scale + bitmap.height / 2
    }
  }

  const localPoints = stroke.points.map(toLocal)

  // 创建临时Canvas用于绘制笔画
  const canvas = document.createElement('canvas')
  canvas.width = targetLayer.bitmap.width
  canvas.height = targetLayer.bitmap.height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('无法创建Canvas上下文')
  }

  // 先绘制原始图层内容
  ctx.drawImage(targetLayer.bitmap, 0, 0)

  // 绘制笔画
  if (localPoints.length > 0) {
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(localPoints[0].x, localPoints[0].y)

    for (let i = 1; i < localPoints.length; i++) {
      const point = localPoints[i]
      const prevPoint = localPoints[i - 1]

      // 使用二次贝塞尔曲线使线条更平滑
      const midX = (prevPoint.x + point.x) / 2
      const midY = (prevPoint.y + point.y) / 2

      if (i === 1) {
        ctx.lineTo(midX, midY)
      } else {
        ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, midX, midY)
      }
    }

    if (localPoints.length > 1) {
      const lastPoint = localPoints[localPoints.length - 1]
      ctx.quadraticCurveTo(
        localPoints[localPoints.length - 2].x,
        localPoints[localPoints.length - 2].y,
        lastPoint.x,
        lastPoint.y
      )
    }

    ctx.stroke()
  }

  // 将绘制结果转换为ImageBitmap并更新图层
  const newBitmap = await createImageBitmap(canvas)
  targetLayer.bitmap.close?.()
  targetLayer.bitmap = newBitmap

  // 触发重新渲染
  renderer.render()
}

/**
 * 创建绘图笔画数据
 * @param points 笔画点数组
 * @param color 颜色，默认为黑色
 * @param size 笔画大小，默认为5
 * @returns DrawStroke对象
 */
export function createStroke(
  points: Point[],
  color: string = '#000000',
  size: number = 5
): DrawStroke {
  return {
    points,
    color,
    size
  }
}

