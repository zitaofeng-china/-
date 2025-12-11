/**
 * 图片上传组件
 * 提供文件选择功能，用于上传图像文件
 */
import React from 'react'

type Props = {
  onSelect?: (file: File) => void
}

export function ImageUploader({ onSelect }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onSelect?.(file)
  }
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:border-blue-500">
      <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <span>上传图片</span>
    </label>
  )
}

