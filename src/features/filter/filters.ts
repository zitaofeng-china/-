/**
 * 滤镜配置
 * 定义可用的图像滤镜类型及其参数范围
 */
export const filters = [
  { name: 'Brightness', key: 'brightness', min: 0, max: 200, default: 100 },
  { name: 'Contrast', key: 'contrast', min: 0, max: 200, default: 100 },
  { name: 'Saturation', key: 'saturation', min: 0, max: 200, default: 100 }
]

