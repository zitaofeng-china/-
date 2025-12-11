/**
 * 全局状态管理
 * 占位全局状态，如需复杂状态管理可替换为 Zustand/Redux
 */
// Placeholder global store. Swap to Zustand/Redux as needed.
export type AppState = {
  ready: boolean
}

export const store: AppState = {
  ready: true
}

