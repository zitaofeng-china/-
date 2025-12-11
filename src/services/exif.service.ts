/**
 * EXIF信息服务
 * 读取和处理图像文件的EXIF元数据信息
 */

export type ExifData = {
  orientation?: number
  width?: number
  height?: number
  make?: string
  model?: string
  dateTime?: string
  [key: string]: any
}

/**
 * 从文件读取EXIF信息
 * 注意：浏览器原生API对EXIF支持有限，此实现提供基本的元数据读取
 * @param file 图像文件
 * @returns Promise<ExifData> EXIF数据对象
 */
export async function readExif(file: File): Promise<ExifData> {
  const data: ExifData = {}

  try {
    // 使用Image对象读取基本尺寸信息
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = objectUrl
    })

    data.width = img.naturalWidth
    data.height = img.naturalHeight

    URL.revokeObjectURL(objectUrl)

    // 读取文件元数据（如果可用）
    if (file.lastModified) {
      data.dateTime = new Date(file.lastModified).toISOString()
    }

    // 注意：完整的EXIF数据读取需要使用第三方库如 exif-js 或 piexifjs
    // 这里提供基础接口，可以根据需要集成专门的EXIF库
  } catch (error) {
    console.warn('读取EXIF信息失败:', error)
  }

  return data
}

