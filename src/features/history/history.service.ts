/**
 * 历史记录服务
 * 提供撤销/重做功能，管理编辑操作的历史记录栈
 */
import { historyState, type HistoryEntry, getCurrent } from './history.store'

/**
 * 限制历史记录索引在有效范围内
 */
const clampIndex = () => {
  if (historyState.index >= historyState.stack.length) {
    historyState.index = historyState.stack.length - 1
  }
  if (historyState.index < -1) historyState.index = -1
}

/**
 * 添加新的历史记录条目
 * 如果当前位置不在栈末尾，会清除后续的重做分支
 * @param entry 要添加的历史记录条目
 */
export function pushHistory(entry: HistoryEntry) {
  // Drop redo branch
  if (historyState.index < historyState.stack.length - 1) {
    historyState.stack.splice(historyState.index + 1)
  }
  historyState.stack.push(entry)
  historyState.index = historyState.stack.length - 1
}

/**
 * 检查是否可以撤销
 * @returns 是否可以撤销
 */
export function canUndo() {
  return historyState.index > 0
}

/**
 * 检查是否可以重做
 * @returns 是否可以重做
 */
export function canRedo() {
  return historyState.index < historyState.stack.length - 1
}

/**
 * 撤销操作
 * @returns 撤销后的历史记录条目，如果无法撤销则返回null
 */
export function undo() {
  if (!canUndo()) return null
  historyState.index -= 1
  clampIndex()
  return getCurrent()
}

/**
 * 重做操作
 * @returns 重做后的历史记录条目，如果无法重做则返回null
 */
export function redo() {
  if (!canRedo()) return null
  historyState.index += 1
  clampIndex()
  return getCurrent()
}

/**
 * 重置历史记录
 */
export function resetHistory() {
  historyState.stack = []
  historyState.index = -1
}

