/**
 * 图层类型定义
 * 定义图层相关的类型，包括 UI 图层、图层操作等
 */

/**
 * UI 图层类型（用于属性面板和图层列表显示）
 */
export type UILayer = {
  id: string
  name: string
  w: number
  h: number
  visible?: boolean
}

