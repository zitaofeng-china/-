/**
 * 服务类型定义
 * 定义各种服务相关的类型
 */

/**
 * 图像元数据类型
 */
export type ImageMeta = {
  width: number
  height: number
  mime: string
}

/**
 * 已加载图像类型
 */
export type LoadedImage = {
  bitmap: ImageBitmap
  exif: ExifData
  file: File
}

/**
 * EXIF 数据类型
 */
export type ExifData = {
  orientation?: number
  [key: string]: any
}

/**
 * 压缩选项类型
 */
export type CompressOptions = {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'image/jpeg' | 'image/png' | 'image/webp'
}

/**
 * 历史记录条目类型
 */
export type HistoryEntry = {
  id: string
  text: string
  timestamp: number
}

