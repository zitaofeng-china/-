/**
 * 文本服务
 * 提供添加文本图层和文本编辑功能的核心逻辑
 */
import type { Renderer } from '../../canvas/engine'

// ==================== 类型定义 ====================

export type TextLayer = {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  color: string
  align: 'left' | 'center' | 'right'
  bold: boolean
  italic: boolean
}

// ==================== 函数实现 ====================

/**
 * 添加文本图层
 * 在画布上创建一个新的文本图层
 * @param renderer Canvas渲染器实例
 * @param textConfig 文本配置
 * @returns Promise<string> 返回创建的图层ID
 */
export async function addTextLayer(
  renderer: Renderer,
  textConfig: Omit<TextLayer, 'id'>
): Promise<string> {
  // 创建临时Canvas用于渲染文本
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('无法创建Canvas上下文')
  }

  // 设置字体样式
  const fontWeight = textConfig.bold ? 'bold' : 'normal'
  const fontStyle = textConfig.italic ? 'italic' : 'normal'
  ctx.font = `${fontStyle} ${fontWeight} ${textConfig.fontSize}px ${textConfig.fontFamily}`
  ctx.fillStyle = textConfig.color
  ctx.textAlign = textConfig.align
  ctx.textBaseline = 'top'

  // 测量文本尺寸
  const metrics = ctx.measureText(textConfig.text)
  const textWidth = metrics.width
  const textHeight = textConfig.fontSize * 1.2 // 估算高度

  // 设置Canvas尺寸（添加一些内边距）
  const padding = 20
  canvas.width = Math.max(textWidth + padding * 2, 100)
  canvas.height = Math.max(textHeight + padding * 2, 50)

  // 重新设置样式（因为Canvas尺寸改变了）
  ctx.font = `${fontStyle} ${fontWeight} ${textConfig.fontSize}px ${textConfig.fontFamily}`
  ctx.fillStyle = textConfig.color
  ctx.textAlign = textConfig.align
  ctx.textBaseline = 'top'

  // 计算文本绘制位置
  let textX = padding
  if (textConfig.align === 'center') {
    textX = canvas.width / 2
  } else if (textConfig.align === 'right') {
    textX = canvas.width - padding
  }

  // 绘制文本
  ctx.fillText(textConfig.text, textX, padding)

  // 转换为ImageBitmap
  const bitmap = await createImageBitmap(canvas)

  // 生成图层ID
  const layerId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const layerName = `Text: ${textConfig.text.substring(0, 20)}`

  // 计算文本图层的offset（考虑内边距）
  // textConfig.x 和 textConfig.y 是文本在图像坐标系中的位置
  // 需要减去padding，因为文本在canvas中的位置有padding偏移
  const offsetX = textConfig.x - padding
  const offsetY = textConfig.y - padding

  // 添加到渲染器，直接指定offset
  await renderer.addImage(
    await new Promise<File>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], `text-${layerId}.png`, { type: 'image/png' }))
        } else {
          reject(new Error('无法创建文本图像'))
        }
      })
    }),
    layerName,
    { x: offsetX, y: offsetY }
  )

  // 找到刚添加的图层（通过名称和时间戳判断，或者返回最后一个图层）
  const addedLayer = renderer.state.layers[renderer.state.layers.length - 1]
  if (addedLayer && addedLayer.name === layerName) {
    // 确保位置正确（addImage可能已经设置了offset，但为了保险再设置一次）
    renderer.setLayerOffset(addedLayer.id, { x: offsetX, y: offsetY })
    return addedLayer.id
  }

  // 如果找不到，尝试通过名称查找
  const layer = renderer.state.layers.find((l) => l.name === layerName)
  if (layer) {
    renderer.setLayerOffset(layer.id, { x: offsetX, y: offsetY })
    return layer.id
  }

  return layerId
}

/**
 * 更新文本图层
 * @param renderer Canvas渲染器实例
 * @param layerId 图层ID
 * @param textConfig 新的文本配置
 */
export async function updateTextLayer(
  renderer: Renderer,
  layerId: string,
  textConfig: Omit<TextLayer, 'id'>
): Promise<void> {
  const layer = renderer.state.layers.find((l) => l.id === layerId)
  if (!layer) {
    throw new Error('文本图层不存在')
  }

  // 获取当前位置（考虑padding，因为文本在canvas中有padding）
  const padding = 20
  const currentX = layer.offset.x + padding
  const currentY = layer.offset.y + padding

  // 保存图层的其他属性
  const savedVisible = layer.visible
  const savedScale = layer.scale
  const savedRotation = layer.rotation
  const savedIndex = renderer.state.layers.findIndex((l) => l.id === layerId)

  // 删除旧图层
  layer.bitmap.close?.()
  if (savedIndex !== -1) {
    renderer.state.layers.splice(savedIndex, 1)
  }

  // 创建新图层（保持相同位置）
  const newLayerId = await addTextLayer(renderer, { ...textConfig, x: currentX, y: currentY })
  
  // 恢复图层的其他属性
  const newLayer = renderer.state.layers.find((l) => l.id === newLayerId)
  if (newLayer) {
    newLayer.visible = savedVisible
    newLayer.scale = savedScale
    newLayer.rotation = savedRotation
    
    // 将新图层移动到原来的位置
    const currentIndex = renderer.state.layers.findIndex((l) => l.id === newLayerId)
    if (currentIndex !== -1 && currentIndex !== savedIndex) {
      const [movedLayer] = renderer.state.layers.splice(currentIndex, 1)
      renderer.state.layers.splice(savedIndex, 0, movedLayer)
    }
  }
  
  renderer.render()
  
  renderer.render()
}

/**
 * 获取默认文本配置
 */
export function getDefaultTextConfig(): Omit<TextLayer, 'id' | 'x' | 'y'> {
  return {
    text: '新文本',
    fontSize: 24,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#000000',
    align: 'left',
    bold: false,
    italic: false
  }
}

