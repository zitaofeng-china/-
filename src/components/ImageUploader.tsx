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
    <label className="image-uploader-button">
      <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <span>打开图像</span>
    </label>
  )
}

