/**
 * 裁剪工具组件
 * 提供图像裁剪功能的用户界面
 */
import React, { useState, useEffect } from 'react'

type AspectRatio = 'free' | '1:1' | '4:3' | '16:9' | '3:2'

type Props = {
  onConfirm?: () => void
  onCancel?: () => void
  crop?: { x: number; y: number; w: number; h: number; rotation: number } | null
  onCropChange?: (crop: { x: number; y: number; w: number; h: number; rotation: number }) => void
  imageSize?: { width: number; height: number }
  /** 是否显示裁剪九宫格等辅助线，由外部控制 */
  guidesVisible?: boolean
  /** 切换裁剪辅助线显示状态 */
  onGuidesVisibleChange?: (visible: boolean) => void
}

export function CropTool({
  onConfirm,
  onCancel,
  crop,
  onCropChange,
  imageSize,
  guidesVisible = true,
  onGuidesVisibleChange
}: Props) {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:2')
  const [width, setWidth] = useState(crop?.w || 0)
  const [height, setHeight] = useState(crop?.h || 0)
  const [isLocked, setIsLocked] = useState(false)

  // 当crop变化时更新宽度和高度
  useEffect(() => {
    if (crop) {
      setWidth(Math.round(crop.w))
      setHeight(Math.round(crop.h))
    }
  }, [crop])

  // 当纵横比变化时，更新尺寸
  useEffect(() => {
    if (!crop || !imageSize || aspectRatio === 'free') {
      setIsLocked(false)
      return
    }

    setIsLocked(true)
    const ratios: Record<AspectRatio, number> = {
      'free': 0,
      '1:1': 1,
      '4:3': 4 / 3,
      '16:9': 16 / 9,
      '3:2': 3 / 2
    }

    const ratio = ratios[aspectRatio]
    if (ratio > 0 && onCropChange) {
      // 保持中心点不变，调整尺寸
      const centerX = crop.x + crop.w / 2
      const centerY = crop.y + crop.h / 2
      
      // 基于当前宽度计算新高度
      let newW = crop.w
      let newH = crop.w / ratio
      
      // 如果新高度超过图像高度，则基于高度计算宽度
      if (newH > imageSize.height) {
        newH = imageSize.height * 0.9
        newW = newH * ratio
      }

      // 确保不超过图像边界
      if (centerX + newW / 2 > imageSize.width) {
        newW = (imageSize.width - centerX) * 2
        newH = newW / ratio
      }
      if (centerY + newH / 2 > imageSize.height) {
        newH = (imageSize.height - centerY) * 2
        newW = newH * ratio
      }
      if (centerX - newW / 2 < 0) {
        newW = centerX * 2
        newH = newW / ratio
      }
      if (centerY - newH / 2 < 0) {
        newH = centerY * 2
        newW = newH * ratio
      }

      const newCrop = {
        x: centerX - newW / 2,
        y: centerY - newH / 2,
        w: newW,
        h: newH,
        rotation: crop.rotation
      }
      
      setWidth(Math.round(newW))
      setHeight(Math.round(newH))
      onCropChange(newCrop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspectRatio]) // 只在纵横比变化时触发

  // 处理宽度变化
  const handleWidthChange = (newWidth: number) => {
    if (!crop || !onCropChange) return
    
    const newW = Math.max(32, Math.min(newWidth, imageSize?.width || Infinity))
    setWidth(newW)
    
    if (isLocked && aspectRatio !== 'free') {
      const ratios: Record<AspectRatio, number> = {
        'free': 0,
        '1:1': 1,
        '4:3': 4 / 3,
        '16:9': 16 / 9,
        '3:2': 3 / 2
      }
      const ratio = ratios[aspectRatio]
      const newH = newW / ratio
      setHeight(Math.round(newH))
      
      const centerX = crop.x + crop.w / 2
      const centerY = crop.y + crop.h / 2
      onCropChange({
        x: centerX - newW / 2,
        y: centerY - newH / 2,
        w: newW,
        h: newH,
        rotation: crop.rotation
      })
    } else if (crop) {
      onCropChange({
        ...crop,
        w: newW
      })
    }
  }

  // 处理高度变化
  const handleHeightChange = (newHeight: number) => {
    if (!crop || !onCropChange) return
    
    const newH = Math.max(32, Math.min(newHeight, imageSize?.height || Infinity))
    setHeight(newH)
    
    if (isLocked && aspectRatio !== 'free') {
      const ratios: Record<AspectRatio, number> = {
        'free': 0,
        '1:1': 1,
        '4:3': 4 / 3,
        '16:9': 16 / 9,
        '3:2': 3 / 2
      }
      const ratio = ratios[aspectRatio]
      const newW = newH * ratio
      setWidth(Math.round(newW))
      
      const centerX = crop.x + crop.w / 2
      const centerY = crop.y + crop.h / 2
      onCropChange({
        x: centerX - newW / 2,
        y: centerY - newH / 2,
        w: newW,
        h: newH,
        rotation: crop.rotation
      })
    } else if (crop) {
      onCropChange({
        ...crop,
        h: newH
      })
    }
  }

  return (
    <div className="crop-tool">
      <h3 className="crop-tool-title">裁剪</h3>
      
      {/* 纵横比选择 */}
      <div className="crop-tool-section">
        <label className="crop-tool-label">纵横比</label>
        <div className="crop-aspect-ratio-buttons">
          {(['free', '1:1', '4:3', '16:9', '3:2'] as AspectRatio[]).map((ratio) => (
            <button
              key={ratio}
              className={`crop-aspect-ratio-button ${aspectRatio === ratio ? 'active' : ''}`}
              onClick={() => setAspectRatio(ratio)}
            >
              {ratio === 'free' ? '自由' : ratio}
            </button>
          ))}
        </div>
      </div>

      {/* 尺寸输入 */}
      <div className="crop-tool-section">
        <div className="crop-dimensions">
          <div className="crop-dimension-item">
            <label className="crop-dimension-label">宽度</label>
            <input
              type="number"
              className="crop-dimension-input"
              value={width}
              onChange={(e) => handleWidthChange(Number(e.target.value))}
              min={32}
              max={imageSize?.width || 10000}
            />
          </div>
          <div className="crop-dimension-item">
            <label className="crop-dimension-label">高度</label>
            <input
              type="number"
              className="crop-dimension-input"
              value={height}
              onChange={(e) => handleHeightChange(Number(e.target.value))}
              min={32}
              max={imageSize?.height || 10000}
            />
          </div>
        </div>
      </div>

      {/* 辅助线开关（单独一行） */}
      <div className="crop-tool-actions" style={{ marginBottom: 12 }}>
        <button
          className="crop-button crop-button-secondary"
          type="button"
          style={{ width: '100%' }}
          onClick={() => onGuidesVisibleChange?.(!guidesVisible)}
        >
          {guidesVisible ? '取消辅助线' : '显示辅助线'}
        </button>
      </div>

      {/* 应用 / 取消按钮 */}
      <div className="crop-tool-actions">
        <button
          className="crop-button crop-button-primary"
          onClick={onConfirm}
        >
          应用
        </button>
        <button
          className="crop-button crop-button-secondary"
          onClick={onCancel}
        >
          取消
        </button>
      </div>
    </div>
  )
}

