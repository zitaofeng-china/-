/**
 * 图像压缩服务
 * 提供图像压缩功能，用于优化文件大小
 */
import type { CompressOptions } from '../types/service'

/**
 * 压缩图像文件
 * @param file 原始图像文件
 * @param options 压缩选项
 * @returns Promise<Blob> 压缩后的图像Blob
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<Blob> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    format = 'image/jpeg'
  } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      // 计算新尺寸，保持宽高比
      let width = img.width
      let height = img.height

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.floor(width * ratio)
        height = Math.floor(height * ratio)
      }

      // 创建Canvas并绘制缩放后的图像
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('无法创建Canvas上下文'))
        return
      }

      // 如果是PNG格式，填充白色背景以避免透明背景导致的文件变大
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
      }

      ctx.drawImage(img, 0, 0, width, height)

      // 转换为Blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('压缩失败'))
          }
        },
        format,
        format === 'image/png' ? undefined : quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('图像加载失败'))
    }

    img.src = objectUrl
  })
}

