/**
 * 标签页组件
 * 提供多标签页切换功能，用于组织不同内容的显示
 */
import React, { useState } from 'react'

export type TabItem = { key: string; label: string; content: React.ReactNode }

export function Tabs({ items, defaultKey }: { items: TabItem[]; defaultKey?: string }) {
  const [active, setActive] = useState(defaultKey ?? items[0]?.key)
  const current = items.find((it) => it.key === active) ?? items[0]
  return (
    <div className="w-full">
      <div className="mb-2 flex gap-2 border-b border-slate-200">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => setActive(it.key)}
            className={`px-3 py-2 text-sm font-medium ${
              it.key === active ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>
      <div className="text-sm text-slate-700">{current?.content}</div>
    </div>
  )
}

