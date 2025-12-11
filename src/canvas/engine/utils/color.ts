/**
 * 颜色工具函数
 * 将十六进制颜色值转换为RGBA格式
 * @param hex 十六进制颜色值（如 '#FF0000' 或 'FF0000'）
 * @param alpha 透明度（0-1），默认为1
 * @returns RGBA颜色字符串
 */
export function toRGBA(hex: string, alpha = 1) {
  const normalized = hex.replace('#', '')
  const bigint = parseInt(normalized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

