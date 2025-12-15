/**
 * 图像加载器
 * 处理图像文件的加载，包括EXIF信息读取和图像预处理
 */
import { readExif } from '../../services/exif.service'
import type { ExifData } from '../../types/service'

// 重新导出 LoadedImage 类型以便使用
export type LoadedImage = {
  bitmap: ImageBitmap
  exif: ExifData
  file: File
}

/**
 * 加载图像文件并读取EXIF信息
 * @param file 图像文件
 * @returns Promise<LoadedImage> 包含位图和EXIF信息的对象
 */
export async function loadImage(file: File): Promise<LoadedImage> {
  // 并行加载位图和读取EXIF
  const [bitmap, exif] = await Promise.all([
    createImageBitmap(file),
    readExif(file)
  ])

  return {
    bitmap,
    exif,
    file
  }
}

/**
 * 根据EXIF方向信息调整图像方向
 * 注意：这需要在绘制时根据orientation值进行旋转
 * @param canvas Canvas元素
 * @param ctx Canvas上下文
 * @param orientation EXIF方向值（1-8）
 * @param width 图像宽度
 * @param height 图像高度
 */
export function applyOrientation(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  orientation: number,
  width: number,
  height: number
): void {
  switch (orientation) {
    case 2:
      // 水平翻转
      ctx.translate(width, 0)
      ctx.scale(-1, 1)
      break
    case 3:
      // 旋转180度
      ctx.translate(width, height)
      ctx.rotate(Math.PI)
      break
    case 4:
      // 垂直翻转
      ctx.translate(0, height)
      ctx.scale(1, -1)
      break
    case 5:
      // 逆时针90度 + 水平翻转
      canvas.width = height
      canvas.height = width
      ctx.translate(height, 0)
      ctx.rotate(Math.PI / 2)
      ctx.scale(-1, 1)
      break
    case 6:
      // 逆时针90度
      canvas.width = height
      canvas.height = width
      ctx.translate(height, 0)
      ctx.rotate(Math.PI / 2)
      break
    case 7:
      // 顺时针90度 + 水平翻转
      canvas.width = height
      canvas.height = width
      ctx.translate(0, width)
      ctx.rotate(-Math.PI / 2)
      ctx.scale(-1, 1)
      break
    case 8:
      // 顺时针90度
      canvas.width = height
      canvas.height = width
      ctx.translate(0, width)
      ctx.rotate(-Math.PI / 2)
      break
    default:
      // 正常方向，无需调整
      break
  }
}

