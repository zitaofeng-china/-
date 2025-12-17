/**
 * 文件服务
 * 处理图像文件的导出功能
 */
import { downloadBlob } from '../utils/download'
import type { Renderer } from '../canvas/engine'

/**
 * 从Canvas导出图像为文件
 * @param renderer Canvas渲染器实例
 * @param filename 导出的文件名，默认为 '图像编辑器.png'
 * @param format 图像格式，默认为 'image/png'
 * @param quality 图像质量（0-1），仅对JPEG格式有效，默认为0.92
 */
export async function exportImage(
  renderer: Renderer,
  filename: string = '图像编辑器.png',
  format: 'image/png' | 'image/jpeg' = 'image/png',
  quality: number = 0.92
): Promise<void> {
  if (renderer.state.layers.length === 0) {
    throw new Error('没有可导出的图像')
  }

  // 计算所有可见图层的实际边界框（考虑offset、scale、rotation）
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  renderer.state.layers.forEach((layer) => {
    if (!layer.visible) return
    
    const { x, y } = layer.offset
    const { width: w, height: h } = layer.bitmap
    const scaledW = w * layer.scale
    const scaledH = h * layer.scale
    
    // 计算图层中心
    const centerX = x + w / 2
    const centerY = y + h / 2
    
    // 计算旋转后的四个角点
    const rad = (layer.rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    
    const halfW = scaledW / 2
    const halfH = scaledH / 2
    
    // 四个角点（相对于中心）
    const corners = [
      { x: -halfW, y: -halfH },
      { x: halfW, y: -halfH },
      { x: halfW, y: halfH },
      { x: -halfW, y: halfH }
    ]
    
    // 旋转并转换为世界坐标
    corners.forEach((corner) => {
      const rotatedX = corner.x * cos - corner.y * sin + centerX
      const rotatedY = corner.x * sin + corner.y * cos + centerY
      
      minX = Math.min(minX, rotatedX)
      minY = Math.min(minY, rotatedY)
      maxX = Math.max(maxX, rotatedX)
      maxY = Math.max(maxY, rotatedY)
    })
  })

  // 如果没有任何可见图层
  if (minX === Infinity) {
    throw new Error('没有可导出的可见图层')
  }

  // 计算实际画布尺寸（不再添加额外白色边距，紧贴内容导出）
  const padding = 0
  const canvasW = Math.ceil(maxX - minX + padding * 2)
  const canvasH = Math.ceil(maxY - minY + padding * 2)
  const offsetX = minX - padding
  const offsetY = minY - padding

  // 创建一个临时Canvas来导出图像
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法创建Canvas上下文')
  }

  // 设置Canvas尺寸为计算出的边界框尺寸
  canvas.width = canvasW
  canvas.height = canvasH

  // 应用滤镜
  const { brightness, contrast, saturation, hue, blur, sharpen, highlights, shadows, temperature, exposure, clarity, fade } = renderer.state.filter
  const filters: string[] = []
  // 将高光 / 阴影简单映射到整体亮度（高光/阴影为负值时整体变暗，为正值时整体变亮）
  const hlOffset = (highlights - 100) * 0.3
  const shOffset = (shadows - 100) * 0.2
  const expOffset = exposure * 0.8
  const effectiveBrightness = brightness + hlOffset + shOffset + expOffset
  if (effectiveBrightness !== 100) filters.push(`brightness(${effectiveBrightness}%)`)

  // 清晰度：轻微提升中频对比度与饱和度
  const clarityContrastBoost = clarity * 0.3
  const claritySaturationBoost = clarity * 0.1

  // 褪色：降低对比、降低饱和、轻微提升亮度
  const fadeStrength = Math.max(0, Math.min(100, fade))
  const fadeBrightnessBoost = fadeStrength * 0.2
  const fadeContrastDrop = fadeStrength * 0.6
  const fadeSaturationDrop = fadeStrength * 0.2

  // 色温模拟：用 sepia + saturate + hue-rotate 组合近似冷暖调
  if (temperature !== 0) {
    const t = Math.max(-100, Math.min(100, temperature))
    const tone = Math.abs(t)
    const sepiaPct = t > 0 ? tone * 0.6 : tone * 0.25
    const saturatePct = 100 + t * 0.3
    const hueShift = t * -0.4
    if (sepiaPct !== 0) filters.push(`sepia(${sepiaPct}%)`)
    if (saturatePct !== 100) filters.push(`saturate(${saturatePct}%)`)
    if (hueShift !== 0) filters.push(`hue-rotate(${hueShift}deg)`)
  }
  // 锐化和对比度结合：锐化通过增加对比度来实现
  const contrastBase = contrast + clarityContrastBoost - fadeContrastDrop
  const effectiveContrast = sharpen > 0 
    ? contrastBase + (sharpen / 100) * 20 
    : contrastBase
  if (effectiveContrast !== 100) filters.push(`contrast(${effectiveContrast}%)`)
  const effectiveSaturation = saturation + claritySaturationBoost - fadeSaturationDrop
  if (effectiveSaturation !== 100) filters.push(`saturate(${effectiveSaturation}%)`)

  // 褪色对亮度的影响
  const fadeEffectiveBrightness = effectiveBrightness + fadeBrightnessBoost
  if (fadeEffectiveBrightness !== effectiveBrightness) {
    // 替换已有的 brightness 计算结果
    const idx = filters.findIndex((f) => f.startsWith('brightness('))
    if (idx >= 0) filters.splice(idx, 1, `brightness(${fadeEffectiveBrightness}%)`)
    else filters.unshift(`brightness(${fadeEffectiveBrightness}%)`)
  }
  if (hue !== 0) filters.push(`hue-rotate(${hue}deg)`)
  if (blur > 0) filters.push(`blur(${blur}px)`)
  ctx.filter = filters.length > 0 ? filters.join(' ') : 'none'

  // 绘制所有可见图层（应用变换和滤镜）
  renderer.state.layers.forEach((layer) => {
    if (!layer.visible) return
    const { x, y } = layer.offset
    const { width: w, height: h } = layer.bitmap
    const scaledW = w * layer.scale
    const scaledH = h * layer.scale
    const centerX = x + w / 2
    const centerY = y + h / 2
    
    // 转换为相对于导出画布的坐标
    const exportCenterX = centerX - offsetX
    const exportCenterY = centerY - offsetY
    
    // 为每个图层单独应用滤镜（确保滤镜正确应用）
    ctx.save()
    ctx.filter = filters.length > 0 ? filters.join(' ') : 'none'
    ctx.translate(exportCenterX, exportCenterY)
    ctx.rotate((layer.rotation * Math.PI) / 180)
    ctx.drawImage(layer.bitmap, -scaledW / 2, -scaledH / 2, scaledW, scaledH)
    ctx.restore() // 恢复滤镜和变换状态
  })

  // 转换为Blob并下载
  return new Promise<void>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('图像导出失败'))
          return
        }
        downloadBlob(blob, filename)
        resolve()
      },
      format,
      quality
    )
  })
}

