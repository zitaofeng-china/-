/**
 * 文本服务
 * 提供添加文本图层和文本编辑功能的核心逻辑
 */
import type { Renderer } from '../../types'
import type { TextLayer } from '../../types/tool'

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

  // 文本转换
  const applyTransform = (s: string) => {
    if (textConfig.textTransform === 'uppercase') return s.toUpperCase()
    if (textConfig.textTransform === 'lowercase') return s.toLowerCase()
    if (textConfig.textTransform === 'capitalize') return s.replace(/\b\w/g, (c) => c.toUpperCase())
    return s
  }

  const linesRaw = textConfig.text.split('\n')
  const lines = linesRaw.map(applyTransform)

  // 设置字体样式
  const fontWeight = textConfig.bold ? 'bold' : 'normal'
  const fontStyle = textConfig.italic ? 'italic' : 'normal'
  ctx.font = `${fontStyle} ${fontWeight} ${textConfig.fontSize}px ${textConfig.fontFamily}`
  ctx.fillStyle = textConfig.color
  ctx.textAlign = textConfig.align
  ctx.textBaseline = 'top'

  // 测量文本尺寸
  // 量测行宽，考虑字间距
  const measureLine = (line: string) => {
    const chars = Array.from(line)
    if (chars.length === 0) return 0
    const base = chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0)
    const spacing = (textConfig.letterSpacing ?? 0) * (chars.length - 1)
    return base + spacing
  }
  const metrics = lines.map((line) => measureLine(line))
  const textWidth = Math.max(...metrics, 0)
  const lineHeightPx = textConfig.fontSize * (textConfig.lineHeight ?? 1.2)
  const textHeight = lineHeightPx * lines.length

  // 设置Canvas尺寸（添加一些内边距）
  const padding = Math.max(0, textConfig.backgroundPadding ?? 20)
  canvas.width = Math.max(textWidth + padding * 2, 100)
  canvas.height = Math.max(textHeight + padding * 2, 50)

  // 重新设置样式（因为Canvas尺寸改变了）
  ctx.font = `${fontStyle} ${fontWeight} ${textConfig.fontSize}px ${textConfig.fontFamily}`
  ctx.fillStyle = textConfig.color
  ctx.textAlign = textConfig.align
  ctx.textBaseline = 'top'
  ctx.globalAlpha = textConfig.opacity ?? 1
  ctx.shadowColor = textConfig.shadowColor
  ctx.shadowBlur = textConfig.shadowBlur
  ctx.shadowOffsetX = textConfig.shadowOffsetX
  ctx.shadowOffsetY = textConfig.shadowOffsetY

  // 计算文本绘制位置
  let textX = padding
  if (textConfig.align === 'center') {
    textX = canvas.width / 2
  } else if (textConfig.align === 'right') {
    textX = canvas.width - padding
  }

  // 绘制多行文本，支持描边、背景、下划线、删除线、圆角背景
  const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
    const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2))
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + w - radius, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
    ctx.lineTo(x + w, y + h - radius)
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
    ctx.lineTo(x + radius, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  const drawBackground = textConfig.backgroundColor && textConfig.backgroundColor !== 'transparent'
  if (drawBackground) {
    ctx.save()
    ctx.fillStyle = textConfig.backgroundColor
    ctx.globalAlpha = textConfig.opacity ?? 1
    drawRoundedRect(padding, padding, textWidth, textHeight, textConfig.backgroundRadius ?? 0)
    ctx.fill()
    ctx.restore()
  }

  lines.forEach((line, idx) => {
    const y = padding + idx * lineHeightPx
    const chars = Array.from(line)
    const totalWidth = metrics[idx]
    const startX =
      textConfig.align === 'center'
        ? textX - totalWidth / 2
        : textConfig.align === 'right'
        ? textX - totalWidth
        : textX

    let cursor = startX
    chars.forEach((ch) => {
      const w = ctx.measureText(ch).width
      if (textConfig.strokeWidth > 0) {
        ctx.lineWidth = textConfig.strokeWidth
        ctx.strokeStyle = textConfig.strokeColor
        ctx.strokeText(ch, cursor, y)
      }
      ctx.fillText(ch, cursor, y)
      cursor += w + (textConfig.letterSpacing ?? 0)
    })

    // 下划线与删除线
    const underlineY = y + textConfig.fontSize * 1.1
    const strikeY = y + textConfig.fontSize * 0.55
    const lineWidth = totalWidth
    if (textConfig.underline) {
      ctx.save()
      ctx.strokeStyle = textConfig.color
      ctx.lineWidth = Math.max(1, textConfig.fontSize * 0.05)
      ctx.beginPath()
      ctx.moveTo(textX - (textConfig.align === 'center' ? lineWidth / 2 : textConfig.align === 'right' ? lineWidth : 0), underlineY)
      ctx.lineTo(textX + (textConfig.align === 'center' ? lineWidth / 2 : textConfig.align === 'right' ? 0 : lineWidth), underlineY)
      ctx.stroke()
      ctx.restore()
    }
    if (textConfig.strike) {
      ctx.save()
      ctx.strokeStyle = textConfig.color
      ctx.lineWidth = Math.max(1, textConfig.fontSize * 0.05)
      ctx.beginPath()
      ctx.moveTo(textX - (textConfig.align === 'center' ? lineWidth / 2 : textConfig.align === 'right' ? lineWidth : 0), strikeY)
      ctx.lineTo(textX + (textConfig.align === 'center' ? lineWidth / 2 : textConfig.align === 'right' ? 0 : lineWidth), strikeY)
      ctx.stroke()
      ctx.restore()
    }
  })

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
 * @returns 新创建的图层ID
 */
export async function updateTextLayer(
  renderer: Renderer,
  layerId: string,
  textConfig: Omit<TextLayer, 'id'>
): Promise<string> {
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
  const savedOpacity = layer.opacity
  const savedBlendMode = layer.blendMode
  const savedLocked = layer.locked
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
    newLayer.opacity = savedOpacity
    newLayer.blendMode = savedBlendMode
    newLayer.locked = savedLocked
    
    // 将新图层移动到原来的位置
    const currentIndex = renderer.state.layers.findIndex((l) => l.id === newLayerId)
    if (currentIndex !== -1 && currentIndex !== savedIndex) {
      if (currentIndex < savedIndex) {
        // 向后移动
        for (let i = currentIndex; i < savedIndex; i++) {
          renderer.moveLayer(newLayerId, 'down')
        }
      } else {
        // 向前移动
        for (let i = currentIndex; i > savedIndex; i--) {
          renderer.moveLayer(newLayerId, 'up')
        }
      }
    }
  }
  
  renderer.render()
  
  // 返回新图层 ID
  return newLayerId
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
    italic: false,
    lineHeight: 1.2,
    opacity: 1,
    strokeColor: '#000000',
    strokeWidth: 0,
    shadowColor: '#000000',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    underline: false,
    strike: false,
    backgroundColor: 'transparent',
    backgroundPadding: 20,
    backgroundRadius: 8,
    letterSpacing: 0,
    textTransform: 'none'
  }
}

