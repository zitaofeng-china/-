/**
 * 工具类型定义
 * 定义各种编辑工具的类型，包括文本、绘制、裁剪、滤镜等
 */

/**
 * 文本图层类型
 */
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
  lineHeight: number
  opacity: number
  strokeColor: string
  strokeWidth: number
  shadowColor: string
  shadowBlur: number
  shadowOffsetX: number
  shadowOffsetY: number
  underline: boolean
  strike: boolean
  backgroundColor: string
  backgroundPadding: number
  backgroundRadius: number
  letterSpacing: number
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
}

/**
 * 绘制点类型
 */
export type DrawPoint = {
  x: number
  y: number
}

/**
 * 绘制笔画类型
 */
export type DrawStroke = {
  points: DrawPoint[]
  color: string
  size: number
}

/**
 * 裁剪矩形类型
 */
export type CropRect = {
  x: number
  y: number
  w: number
  h: number
  rotation: number
}

/**
 * 滤镜状态类型
 */
export type FilterState = {
  brightness: number
  contrast: number
  saturation: number
  hue: number
  blur: number
  sharpen: number
}

