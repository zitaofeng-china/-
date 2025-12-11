/**
 * 历史记录状态管理
 * 定义历史记录条目的数据结构和管理状态
 */
export type HistoryEntry = {
  id: string
  state: {
    filter: { brightness: number; contrast: number; saturation: number }
    cropEnabled: boolean
    crop: { x: number; y: number; w: number; h: number; rotation: number } | null
    zoom: number
    offset: { x: number; y: number }
    fileName: string | null
  }
}

export const historyState = {
  stack: [] as HistoryEntry[],
  index: -1
}

/**
 * 获取当前历史记录条目
 * @returns 当前历史记录条目，如果不存在则返回null
 */
export function getCurrent() {
  if (historyState.index < 0) return null
  return historyState.stack[historyState.index] || null
}

