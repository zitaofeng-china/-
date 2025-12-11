/**
 * 编辑器类型定义
 * 定义编辑器相关的类型，包括工具类型和图层类型
 */
export type Tool = 'crop' | 'filter' | 'text' | 'draw'
export type Layer = { id: string; type: 'image' | 'text' | 'shape' }

