/**
 * Canvas画布舞台组件
 * 核心画布组件，负责图像渲染、缩放、平移、裁剪等交互功能
 * 使用双层Canvas架构：背景层渲染图像，UI层绘制交互元素
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createRenderer, type Renderer } from '../../canvas/engine'
import { ImageUploader } from '../../components/ImageUploader'
import { Button } from '../../components/ui/Button'
import Slider from '../../components/ui/Slider'
import { useCanvasResize } from '../../hooks/useCanvasResize'
import { useDrag } from '../../hooks/useDrag'
import { exportImage } from '../../services/file.service'
import { drawStroke, createStroke, type Point as DrawPoint } from '../../features/draw/draw.service'
import { addTextLayer, getDefaultTextConfig, type TextLayer } from '../../features/text/text.service'
import { Toast } from '../../components/Toast'

type Point = { x: number; y: number }
type CropHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
type CropState = { x: number; y: number; w: number; h: number; rotation: number }
type Hit = { mode: 'move' } | { mode: 'resize'; handle: CropHandle } | { mode: 'rotate' }

type Props = {
  cropEnabled: boolean
  drawEnabled?: boolean
  textEnabled?: boolean
  filterState: { brightness: number; contrast: number; saturation: number }
  onFilterChange: (next: { brightness: number; contrast: number; saturation: number }) => void
  onFileNameChange: (name: string | null) => void
  onTimeline: (text: string) => void
  onLayersChange?: (layers: { id: string; name: string; w: number; h: number }[]) => void
  activeLayerId?: string | null
  onActiveLayerChange?: (id: string | null) => void
  onTextLayerCreated?: (layerId: string, config: Omit<TextLayer, 'id' | 'x' | 'y'>) => void
}

const CanvasStage = React.forwardRef<
  {
    handleDrawConfig?: (color: string, size: number) => void
    handleAddText?: (config: Omit<TextLayer, 'id' | 'x' | 'y'>) => void
    handleCropConfirm?: () => void
    handleLayerDelete?: (id: string) => void
    handleLayerVisibilityToggle?: (id: string, visible: boolean) => void
    handleLayerMove?: (id: string, direction: 'up' | 'down') => void
    handleLayerDuplicate?: (id: string) => void
    onTextLayerCreated?: (layerId: string, config: Omit<TextLayer, 'id' | 'x' | 'y'>) => void
  },
  Props
>(function CanvasStage({
  cropEnabled,
  drawEnabled = false,
  textEnabled = false,
  filterState,
  onFilterChange,
  onFileNameChange,
  onTimeline,
  onLayersChange,
  activeLayerId,
  onActiveLayerChange,
  onTextLayerCreated
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  const uiCanvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<Renderer | null>(null)

  const [zoomPct, setZoomPct] = useState(100)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [crop, setCrop] = useState<CropState | null>(null)
  const [layers, setLayers] = useState<{ id: string; name: string; w: number; h: number }[]>([])
  const [drawColor, setDrawColor] = useState('#000000')
  const [drawSize, setDrawSize] = useState(5)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawPoints, setDrawPoints] = useState<DrawPoint[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isMovingLayer, setIsMovingLayer] = useState(false)
  const [movingLayerId, setMovingLayerId] = useState<string | null>(null)
  const [layerMoveStart, setLayerMoveStart] = useState<Point | null>(null)

  const minCropSize = 32

  const resizeToContainer = useCallback(() => {
    const renderer = rendererRef.current
    const container = containerRef.current
    if (!renderer || !container) return
    const { width, height } = container.getBoundingClientRect()
    renderer.setSize(width, height)
  }, [])

  useCanvasResize(resizeToContainer)

  useEffect(() => {
    if (!bgCanvasRef.current || !uiCanvasRef.current) return
    const renderer = createRenderer(bgCanvasRef.current, uiCanvasRef.current)
    rendererRef.current = renderer
    requestAnimationFrame(resizeToContainer)
    return () => renderer.destroy()
  }, [resizeToContainer])

  const syncZoom = () => {
    const renderer = rendererRef.current
    if (!renderer) return
    setZoomPct(Math.round(renderer.state.zoom * 100))
  }

  const getTransforms = () => {
    const renderer = rendererRef.current
    if (!renderer || renderer.state.layers.length === 0) return null
    const { w: vw, h: vh } = renderer.state.view
    const { w: iw, h: ih } = renderer.state.imgSize
    const zoom = renderer.state.zoom
    const offset = renderer.state.offset
    const drawW = iw * zoom
    const drawH = ih * zoom
    const cx = vw / 2 + offset.x
    const cy = vh / 2 + offset.y
    const origin = { x: cx - drawW / 2, y: cy - drawH / 2 }
    return { vw, vh, iw, ih, zoom, origin }
  }

  const imageToView = (pt: Point) => {
    const t = getTransforms()
    if (!t) return null
    return { x: t.origin.x + pt.x * t.zoom, y: t.origin.y + pt.y * t.zoom }
  }

  const viewToImage = (pt: Point) => {
    const t = getTransforms()
    if (!t) return null
    return { x: (pt.x - t.origin.x) / t.zoom, y: (pt.y - t.origin.y) / t.zoom }
  }

  const toLocal = (imgPt: Point, rect: CropState) => {
    const cx = rect.x + rect.w / 2
    const cy = rect.y + rect.h / 2
    const dx = imgPt.x - cx
    const dy = imgPt.y - cy
    const rad = (-rect.rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    return { x: dx * cos - dy * sin, y: dx * sin + dy * cos }
  }

  const fromLocalOffset = (offset: Point, rect: CropState) => {
    const rad = (rect.rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    return { x: offset.x * cos - offset.y * sin, y: offset.x * sin + offset.y * cos }
  }

  const updateOverlay = useCallback(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    renderer.setOverlay((ctx) => {
      // 绘制选中图层的边框（考虑缩放和旋转）
      if (activeLayerId && !cropEnabled && renderer.state.layers.length > 0) {
        const layer = renderer.state.layers.find((l) => l.id === activeLayerId)
        if (layer && layer.visible) {
          const t = getTransforms()
          if (t) {
            const { x, y } = layer.offset
            const { width: w, height: h } = layer.bitmap
            const scaledW = w * layer.scale * t.zoom
            const scaledH = h * layer.scale * t.zoom
            
            // 计算图层中心在视图中的位置
            const centerView = imageToView({ x: x + w / 2, y: y + h / 2 })
            
            if (centerView) {
              ctx.save()
              ctx.translate(centerView.x, centerView.y)
              ctx.rotate((layer.rotation * Math.PI) / 180)
              
              ctx.strokeStyle = '#3b82f6'
              ctx.lineWidth = 2 / t.zoom
              ctx.setLineDash([4 / t.zoom, 4 / t.zoom])
              ctx.strokeRect(-scaledW / 2, -scaledH / 2, scaledW, scaledH)
              ctx.setLineDash([])
              ctx.restore()
            }
          }
        }
      }
      
      // 裁剪模式的overlay
      if (cropEnabled && crop && renderer.state.layers.length > 0) {
        const t = getTransforms()
        if (!t) return

        const halfW = crop.w / 2
        const halfH = crop.h / 2
        const center = { x: crop.x + halfW, y: crop.y + halfH }
        const rad = (crop.rotation * Math.PI) / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        const localPoints = [
          { x: -halfW, y: -halfH },
          { x: halfW, y: -halfH },
          { x: halfW, y: halfH },
          { x: -halfW, y: halfH }
        ]
        const toView = (p: Point) => {
          const rx = p.x * cos - p.y * sin + center.x
          const ry = p.x * sin + p.y * cos + center.y
          return imageToView({ x: rx, y: ry })
        }
        const points = localPoints.map((p) => toView(p)!)
        const rotateHandleView = toView({ x: 0, y: -halfH - 32 })
        const midPoints = [
          toView({ x: 0, y: -halfH }),
          toView({ x: halfW, y: 0 }),
          toView({ x: 0, y: halfH }),
          toView({ x: -halfW, y: 0 })
        ]

        ctx.save()
        ctx.fillStyle = 'rgba(15, 23, 42, 0.55)'
        ctx.beginPath()
        ctx.rect(0, 0, t.vw, t.vh)
        ctx.moveTo(points[0].x, points[0].y)
        points.forEach((p, i) => {
          if (i === 0) return
          ctx.lineTo(p.x, p.y)
        })
        ctx.closePath()
        ctx.fill('evenodd')

        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = 1.5
        ctx.setLineDash([6, 6])
        ctx.beginPath()
        points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        })
        ctx.closePath()
        ctx.stroke()
        ctx.setLineDash([])

        const drawHandle = (p?: Point | null, size = 9) => {
          if (!p) return
          const half = size / 2
          ctx.fillStyle = '#fff'
          ctx.strokeStyle = '#0f172a'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.rect(p.x - half, p.y - half, size, size)
          ctx.fill()
          ctx.stroke()
        }
        points.forEach((p) => drawHandle(p))
        midPoints.forEach((p) => drawHandle(p, 7))

        if (rotateHandleView) {
          ctx.beginPath()
          ctx.moveTo(midPoints[0]!.x, midPoints[0]!.y)
          ctx.lineTo(rotateHandleView.x, rotateHandleView.y)
          ctx.strokeStyle = '#38bdf8'
          ctx.lineWidth = 1
          ctx.stroke()

          ctx.beginPath()
          ctx.arc(rotateHandleView.x, rotateHandleView.y, 7, 0, Math.PI * 2)
          ctx.fillStyle = '#fff'
          ctx.fill()
          ctx.strokeStyle = '#0f172a'
          ctx.stroke()
        }

        ctx.restore()
      }
    })
    renderer.render()
  }, [crop, cropEnabled, activeLayerId, imageToView, getTransforms])

  const syncLayers = useCallback(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    const sizes = renderer.state.layers.map((l) => ({
      id: l.id,
      name: l.name,
      w: l.bitmap.width,
      h: l.bitmap.height,
      visible: l.visible
    }))
    setLayers(sizes)
    onLayersChange?.(sizes)
  }, [onLayersChange])

  const handleUpload = async (file: File) => {
    const renderer = rendererRef.current
    if (!renderer) return
    setFileName(file.name)
    onFileNameChange(file.name)
    await renderer.loadImage(file)
    syncLayers()
    if (!activeLayerId && renderer.state.layers.length) {
      onActiveLayerChange?.(renderer.state.layers[renderer.state.layers.length - 1].id)
    }
    renderer.fitToView()
    syncZoom()
    onTimeline(`上传图片：${file.name}`)
    const { w, h } = renderer.state.imgSize
    const boxW = w * 0.6
    const boxH = h * 0.6
    if (cropEnabled) {
      setCrop({ x: (w - boxW) / 2, y: (h - boxH) / 2, w: boxW, h: boxH, rotation: 0 })
    } else {
      setCrop(null)
      renderer.setOverlay(null)
      renderer.render()
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const renderer = rendererRef.current
    if (!renderer) return
    const rect = containerRef.current?.getBoundingClientRect()
    const pointer = rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : undefined
    renderer.zoomBy(e.deltaY, pointer)
    syncZoom()
  }

  const dragHandlers = useDrag(
    (dx, dy) => {
      rendererRef.current?.pan(dx, dy)
    },
    () => {
      setIsDragging(false)
      // 画布平移结束时记录到时间线
      onTimeline('平移画布')
    },
    () => setIsDragging(true)
  )

  // 检测点击是否在某个图层上（考虑缩放和旋转）
  const hitTestLayer = useCallback((viewPt: Point): string | null => {
    const renderer = rendererRef.current
    if (!renderer || renderer.state.layers.length === 0) return null
    
    const imgPt = viewToImage(viewPt)
    if (!imgPt) return null
    
    // 从最上层开始检测（reverse order）
    const layers = [...renderer.state.layers].reverse()
    for (const layer of layers) {
      if (!layer.visible) continue
      
      const { x, y } = layer.offset
      const { width: w, height: h } = layer.bitmap
      const centerX = x + w / 2
      const centerY = y + h / 2
      
      // 将点转换到图层的局部坐标系（考虑旋转）
      const dx = imgPt.x - centerX
      const dy = imgPt.y - centerY
      const rad = (-layer.rotation * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      const localX = dx * cos - dy * sin
      const localY = dx * sin + dy * cos
      
      // 检查点是否在缩放后的图层范围内
      const halfW = (w * layer.scale) / 2
      const halfH = (h * layer.scale) / 2
      
      if (Math.abs(localX) <= halfW && Math.abs(localY) <= halfH) {
        return layer.id
      }
    }
    
    return null
  }, [viewToImage])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!rendererRef.current || rendererRef.current.state.layers.length === 0) {
      // 没有图层时，使用画布拖拽
      if (!cropEnabled) {
        dragHandlers.onMouseDown(e)
      }
      return
    }
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const viewPt = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    
    // 如果是绘图模式，开始绘制
    if (drawEnabled) {
      e.preventDefault()
      e.stopPropagation()
      setIsDrawing(true)
      const imgPt = viewToImage(viewPt)
      if (imgPt) {
        setDrawPoints([imgPt])
      }
      return
    }

    // 检测点击是否在图层上
    const hitLayerId = hitTestLayer(viewPt)
    
    // 如果点击在图层上
    if (hitLayerId) {
      // 如果点击的是已选中的图层，开始拖拽移动
      if (hitLayerId === activeLayerId && !cropEnabled) {
        e.preventDefault()
        e.stopPropagation()
        setIsMovingLayer(true)
        setMovingLayerId(activeLayerId)
        const imgPt = viewToImage(viewPt)
        if (imgPt) {
          setLayerMoveStart(imgPt)
        }
        return
      } else {
        // 如果点击的是其他图层，切换选中状态
        e.preventDefault()
        e.stopPropagation()
        onActiveLayerChange?.(hitLayerId)
        return
      }
    } else {
      // 点击在空白处，取消选中（可选）或保持当前选中
      // 如果当前没有选中，可以使用画布拖拽
      if (!activeLayerId && !cropEnabled) {
        dragHandlers.onMouseDown(e)
      } else if (!cropEnabled) {
        // 有选中图层但点击空白处，可选：取消选中或拖拽画布
        // 这里我们选择拖拽画布
        dragHandlers.onMouseDown(e)
      }
    }
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const viewPt = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      
      // 移动图层
      if (isMovingLayer && movingLayerId && layerMoveStart) {
        const renderer = rendererRef.current
        if (!renderer) return
        
        const currentImgPt = viewToImage(viewPt)
        if (!currentImgPt) return
        
        // 计算偏移量（在图像坐标系中）
        const dx = currentImgPt.x - layerMoveStart.x
        const dy = currentImgPt.y - layerMoveStart.y
        
        // 移动图层
        renderer.moveLayerOffset(movingLayerId, dx, dy)
        
        // 更新起始点
        setLayerMoveStart(currentImgPt)
        return
      }
      
      // 绘制模式
      if (drawEnabled && isDrawing && rendererRef.current) {
        const imgPt = viewToImage(viewPt)
        if (imgPt) {
          setDrawPoints((prev) => [...prev, imgPt])
        }
      }
    },
    [drawEnabled, isDrawing, isMovingLayer, movingLayerId, layerMoveStart, viewToImage]
  )

  const handleMouseUp = useCallback(async () => {
    // 结束图层移动
    if (isMovingLayer && movingLayerId) {
      setIsMovingLayer(false)
      const movedLayerId = movingLayerId
      setMovingLayerId(null)
      setLayerMoveStart(null)
      syncLayers()
      onTimeline(`移动图层: ${rendererRef.current?.state.layers.find((l) => l.id === movedLayerId)?.name || movedLayerId}`)
      return
    }
    
    // 绘制完成
    if (drawEnabled && isDrawing && drawPoints.length > 0 && rendererRef.current) {
      try {
        const stroke = createStroke(drawPoints, drawColor, drawSize)
        await drawStroke(rendererRef.current, stroke, activeLayerId || undefined)
        setDrawPoints([])
        onTimeline('绘制完成')
        syncLayers()
      } catch (error) {
        console.error('绘制失败:', error)
        setToastMessage('绘制失败')
      }
      setIsDrawing(false)
    }
  }, [drawEnabled, isDrawing, drawPoints, drawColor, drawSize, activeLayerId, onTimeline, isMovingLayer, syncLayers])

  useEffect(() => {
    if ((drawEnabled && isDrawing) || isMovingLayer) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [drawEnabled, isDrawing, isMovingLayer, handleMouseMove, handleMouseUp])

  const handleZoomChange = (value: number) => {
    const renderer = rendererRef.current
    if (!renderer) return
    renderer.zoomTo(value / 100)
    syncZoom()
  }

  const zoomStep = (delta: number) => {
    handleZoomChange(zoomPct + delta)
  }

  const fitImage = () => {
    rendererRef.current?.fitToView()
    syncZoom()
    onTimeline('适配视图')
  }

  const handleCropConfirm = useCallback(async () => {
    const renderer = rendererRef.current
    if (!renderer || !crop || !activeLayerId) return
    await renderer.applyCrop(crop, activeLayerId)
    const { w, h } = renderer.state.imgSize
    const boxW = w * 0.8
    const boxH = h * 0.8
    setCrop({ x: (w - boxW) / 2, y: (h - boxH) / 2, w: boxW, h: boxH, rotation: 0 })
    renderer.fitToView()
    syncZoom()
    onTimeline('裁剪完成')
  }, [crop, activeLayerId, onTimeline])

  const handleExport = async () => {
    const renderer = rendererRef.current
    if (!renderer || renderer.state.layers.length === 0) {
      setToastMessage('没有可导出的图像')
      return
    }

    try {
      const exportFileName = '图像编辑器.png'
      await exportImage(renderer, exportFileName)
      setToastMessage('导出成功')
      onTimeline('导出图像')
      setTimeout(() => setToastMessage(null), 2000)
    } catch (error) {
      console.error('导出失败:', error)
      setToastMessage('导出失败')
      setTimeout(() => setToastMessage(null), 2000)
    }
  }

  // 处理添加文本
  const handleAddText = useCallback(
    async (config: Omit<TextLayer, 'id' | 'x' | 'y'>) => {
      const renderer = rendererRef.current
      if (!renderer) {
        setToastMessage('请先加载图像')
        return
      }

      try {
        // 计算文本位置（画布中心或图像中心）
        let textX = 0
        let textY = 0
        
        if (renderer.state.layers.length > 0) {
          // 如果有图层，使用图像中心
          const { w, h } = renderer.state.imgSize
          textX = w / 2
          textY = h / 2
        } else {
          // 如果没有图层，使用视图中心转换到图像坐标
          const { w, h } = renderer.state.view
          const centerX = w / 2
          const centerY = h / 2
          const imgCenter = viewToImage({ x: centerX, y: centerY })
          if (imgCenter) {
            textX = imgCenter.x
            textY = imgCenter.y
          }
        }
        
        const layerId = await addTextLayer(renderer, {
          ...config,
          x: textX,
          y: textY
        })
        
        syncLayers()
        
        // 通知父组件文本图层已创建，保存元数据
        if (layerId && onTextLayerCreated) {
          onTextLayerCreated(layerId, config)
        }
        
        // 激活新添加的文本图层
        if (layerId) {
          onActiveLayerChange?.(layerId)
        } else if (renderer.state.layers.length > 0) {
          onActiveLayerChange?.(renderer.state.layers[renderer.state.layers.length - 1].id)
        }
        
        onTimeline(`添加文本：${config.text}`)
        setToastMessage('文本已添加')
        setTimeout(() => setToastMessage(null), 2000)
      } catch (error) {
        console.error('添加文本失败:', error)
        setToastMessage('添加文本失败')
        setTimeout(() => setToastMessage(null), 2000)
      }
    },
    [viewToImage, onTimeline, onLayersChange, onActiveLayerChange]
  )

  // 图层操作方法
  const handleLayerDelete = useCallback(
    (id: string) => {
      const renderer = rendererRef.current
      if (!renderer) return
      const layerName = renderer.state.layers.find((l) => l.id === id)?.name || id
      renderer.deleteLayer(id)
      syncLayers()
      // 如果删除的是当前激活的图层，切换到其他图层
      if (id === activeLayerId) {
        const remainingLayers = renderer.state.layers
        onActiveLayerChange?.(remainingLayers.length > 0 ? remainingLayers[remainingLayers.length - 1].id : null)
      }
      onTimeline(`删除图层：${layerName}`)
    },
    [syncLayers, onTimeline, activeLayerId, onActiveLayerChange]
  )

  const handleLayerVisibilityToggle = useCallback(
    (id: string, visible: boolean) => {
      const renderer = rendererRef.current
      if (!renderer) return
      renderer.setLayerVisibility(id, visible)
      syncLayers()
      onTimeline(`${visible ? '显示' : '隐藏'}图层`)
    },
    [syncLayers, onTimeline]
  )

  const handleLayerMove = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const renderer = rendererRef.current
      if (!renderer) return
      renderer.moveLayer(id, direction)
      syncLayers()
      onTimeline(`移动图层：${direction === 'up' ? '上移' : '下移'}`)
    },
    [syncLayers, onTimeline]
  )

  const handleLayerDuplicate = useCallback(
    (id: string) => {
      const renderer = rendererRef.current
      if (!renderer) return
      renderer.duplicateLayer(id)
      syncLayers()
      onTimeline('复制图层')
    },
    [syncLayers, onTimeline]
  )

  const handleLayerScaleChange = useCallback((id: string, scale: number) => {
    const renderer = rendererRef.current
    if (!renderer) return
    renderer.setLayerScale(id, scale)
    syncLayers()
    // 不在拖动过程中记录，只在拖动结束时记录
  }, [syncLayers])

  const handleLayerScaleChangeEnd = useCallback((id: string, scale: number) => {
    onTimeline(`调整图层缩放: ${Math.round(scale * 100)}%`)
  }, [onTimeline])

  const handleLayerRotationChange = useCallback((id: string, rotation: number) => {
    const renderer = rendererRef.current
    if (!renderer) return
    renderer.setLayerRotation(id, rotation)
    syncLayers()
    // 不在拖动过程中记录，只在拖动结束时记录
  }, [syncLayers])

  const handleLayerRotationChangeEnd = useCallback((id: string, rotation: number) => {
    onTimeline(`调整图层旋转: ${Math.round(rotation)}°`)
  }, [onTimeline])

  // 通过ref暴露方法给父组件
  React.useImperativeHandle(
    ref,
    () => ({
      handleDrawConfig: (color: string, size: number) => {
        setDrawColor(color)
        setDrawSize(size)
      },
      handleAddText: handleAddText,
      handleCropConfirm: handleCropConfirm,
      handleLayerDelete: handleLayerDelete,
      handleLayerVisibilityToggle: handleLayerVisibilityToggle,
      handleLayerMove: handleLayerMove,
      handleLayerDuplicate: handleLayerDuplicate,
      handleLayerScaleChange: handleLayerScaleChange,
      handleLayerScaleChangeEnd: handleLayerScaleChangeEnd,
      handleLayerRotationChange: handleLayerRotationChange,
      handleLayerRotationChangeEnd: handleLayerRotationChangeEnd,
      getRenderer: () => rendererRef.current
    }),
    [handleAddText, handleCropConfirm, handleLayerDelete, handleLayerVisibilityToggle, handleLayerMove, handleLayerDuplicate, handleLayerScaleChange, handleLayerScaleChangeEnd, handleLayerRotationChange, handleLayerRotationChangeEnd]
  )

  const hitTest = (viewPt: Point): Hit | null => {
    if (!crop) return null
    const imgPt = viewToImage(viewPt)
    if (!imgPt) return null
    const local = toLocal(imgPt, crop)
    const halfW = crop.w / 2
    const halfH = crop.h / 2
    const zoom = rendererRef.current?.state.zoom || 1
    const tol = 12 / zoom
    const rotateTol = 10 / zoom

    const near = (a: number, b: number) => Math.abs(a - b) <= tol
    const insideRect = Math.abs(local.x) <= halfW && Math.abs(local.y) <= halfH

    if (Math.hypot(local.x, local.y + halfH + 32 / zoom) <= rotateTol * 1.4) {
      return { mode: 'rotate' }
    }

    const handleChecks: Array<[Hit, boolean]> = [
      [{ mode: 'resize', handle: 'nw' }, near(local.x, -halfW) && near(local.y, -halfH)],
      [{ mode: 'resize', handle: 'ne' }, near(local.x, halfW) && near(local.y, -halfH)],
      [{ mode: 'resize', handle: 'se' }, near(local.x, halfW) && near(local.y, halfH)],
      [{ mode: 'resize', handle: 'sw' }, near(local.x, -halfW) && near(local.y, halfH)],
      [{ mode: 'resize', handle: 'n' }, near(local.y, -halfH) && Math.abs(local.x) < halfW],
      [{ mode: 'resize', handle: 'e' }, near(local.x, halfW) && Math.abs(local.y) < halfH],
      [{ mode: 'resize', handle: 's' }, near(local.y, halfH) && Math.abs(local.x) < halfW],
      [{ mode: 'resize', handle: 'w' }, near(local.x, -halfW) && Math.abs(local.y) < halfH]
    ]
    for (const [hit, ok] of handleChecks) {
      if (ok) return hit
    }
    if (insideRect) return { mode: 'move' }
    return null
  }

  const interactionRef = useRef<{
    mode: Hit['mode']
    handle?: CropHandle
    startCrop: CropState
    startPointerImg: Point
    startLocal?: Point
    startRotation?: number
  } | null>(null)

  const applyCrop = (next: CropState) => {
    setCrop(next)
    rendererRef.current?.render()
  }

  const onCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropEnabled || !crop || !rendererRef.current || rendererRef.current.state.layers.length === 0) return
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const viewPt = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    const hit = hitTest(viewPt)
    if (!hit) return
    e.stopPropagation()
    e.preventDefault()
    const imgPt = viewToImage(viewPt)
    if (!imgPt) return
    const local = toLocal(imgPt, crop)
    interactionRef.current = {
      mode: hit.mode,
      handle: hit.mode === 'resize' ? hit.handle : undefined,
      startCrop: crop,
      startPointerImg: imgPt,
      startLocal: local,
      startRotation: crop.rotation
    }
    window.addEventListener('mousemove', onCropMouseMove)
    window.addEventListener('mouseup', onCropMouseUp)
  }

  const onCropMouseMove = (e: MouseEvent) => {
    const session = interactionRef.current
    if (!session || !cropEnabled || !crop) return
    const renderer = rendererRef.current
    if (!renderer) return
    const canvasRect = uiCanvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return
    const viewPt = { x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top }
    const imgPt = viewToImage(viewPt)
    if (!imgPt) return

    const deltaImg = { x: imgPt.x - session.startPointerImg.x, y: imgPt.y - session.startPointerImg.y }
    const start = session.startCrop
    const halfW0 = start.w / 2
    const halfH0 = start.h / 2
    const center0 = { x: start.x + halfW0, y: start.y + halfH0 }
    const rad = (start.rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const toLocalFromStart = (pt: Point) => {
      const dx = pt.x - center0.x
      const dy = pt.y - center0.y
      return { x: dx * cos - dy * sin, y: dx * sin + dy * cos }
    }

    if (session.mode === 'move') {
      applyCrop({
        ...start,
        x: start.x + deltaImg.x,
        y: start.y + deltaImg.y
      })
    } else if (session.mode === 'rotate') {
      const a0 = Math.atan2(session.startPointerImg.y - center0.y, session.startPointerImg.x - center0.x)
      const a1 = Math.atan2(imgPt.y - center0.y, imgPt.x - center0.x)
      const nextRot = (session.startRotation ?? 0) + ((a1 - a0) * 180) / Math.PI
      applyCrop({ ...start, rotation: nextRot })
    } else if (session.mode === 'resize' && session.handle) {
      const currentLocal = toLocalFromStart(imgPt)
      const handle = session.handle
      const minHalf = minCropSize / 2

      const anchor = (() => {
        switch (handle) {
          case 'e':
            return { x: -halfW0, y: 0 }
          case 'w':
            return { x: halfW0, y: 0 }
          case 'n':
            return { x: 0, y: halfH0 }
          case 's':
            return { x: 0, y: -halfH0 }
          case 'ne':
            return { x: -halfW0, y: halfH0 }
          case 'nw':
            return { x: halfW0, y: halfH0 }
          case 'se':
            return { x: -halfW0, y: -halfH0 }
          case 'sw':
            return { x: halfW0, y: -halfH0 }
          default:
            return { x: 0, y: 0 }
        }
      })()

      let nextHalfW = halfW0
      let nextHalfH = halfH0
      let nextCenterLocal: Point = { x: 0, y: 0 }

      if (handle === 'e' || handle === 'w') {
        nextHalfW = Math.max(minHalf, Math.abs(currentLocal.x - anchor.x) / 2)
        nextCenterLocal = { x: (currentLocal.x + anchor.x) / 2, y: 0 }
      } else if (handle === 'n' || handle === 's') {
        nextHalfH = Math.max(minHalf, Math.abs(currentLocal.y - anchor.y) / 2)
        nextCenterLocal = { x: 0, y: (currentLocal.y + anchor.y) / 2 }
      } else {
        nextHalfW = Math.max(minHalf, Math.abs(currentLocal.x - anchor.x) / 2)
        nextHalfH = Math.max(minHalf, Math.abs(currentLocal.y - anchor.y) / 2)
        nextCenterLocal = { x: (currentLocal.x + anchor.x) / 2, y: (currentLocal.y + anchor.y) / 2 }
      }

      const centerOffsetImg = fromLocalOffset(nextCenterLocal, start)
      const center = { x: center0.x + centerOffsetImg.x, y: center0.y + centerOffsetImg.y }
      applyCrop({
        ...start,
        x: center.x - nextHalfW,
        y: center.y - nextHalfH,
        w: nextHalfW * 2,
        h: nextHalfH * 2
      })
    }
  }

  const onCropMouseUp = () => {
    // 裁剪框拖动结束时记录到时间线
    if (interactionRef.current) {
      const mode = interactionRef.current.mode
      if (mode === 'move') {
        onTimeline('移动裁剪框')
      } else if (mode === 'resize') {
        onTimeline('调整裁剪框大小')
      } else if (mode === 'rotate') {
        onTimeline('旋转裁剪框')
      }
    }
    interactionRef.current = null
    window.removeEventListener('mousemove', onCropMouseMove)
    window.removeEventListener('mouseup', onCropMouseUp)
  }

  useEffect(() => updateOverlay(), [updateOverlay])

  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    if (!cropEnabled) {
      setCrop(null)
      updateOverlay()
      return
    }
    if (renderer.state.layers.length && !crop) {
      const { w, h } = renderer.state.imgSize
      const boxW = w * 0.6
      const boxH = h * 0.6
      setCrop({ x: (w - boxW) / 2, y: (h - boxH) / 2, w: boxW, h: boxH, rotation: 0 })
    }
  }, [cropEnabled, crop, updateOverlay])

  // 当activeLayerId变化时，更新overlay显示
  useEffect(() => {
    updateOverlay()
  }, [activeLayerId, updateOverlay])

  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    renderer.setFilter(filterState)
    rendererRef.current?.render()
  }, [filterState])

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    for (const file of files) {
      await rendererRef.current?.addImage(file)
      onTimeline(`拖拽添加：${file.name}`)
    }
    if (rendererRef.current) {
      syncLayers()
      if (!activeLayerId && rendererRef.current.state.layers.length) {
        onActiveLayerChange?.(rendererRef.current.state.layers[rendererRef.current.state.layers.length - 1].id)
      }
      rendererRef.current.fitToView()
      syncZoom()
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // 通过useEffect暴露给父组件
  useEffect(() => {
    if (textEnabled) {
      // 可以通过ref或事件传递handleAddText
    }
  }, [textEnabled])

  return (
    <div className="editor-canvas-area">
      <div className="canvas-toolbar glass">
        <ImageUploader onSelect={handleUpload} />
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={fitImage}>
            适配
          </Button>
          <Button variant="ghost" onClick={() => zoomStep(-10)}>
            -
          </Button>
          <div className="w-48">
            <Slider value={zoomPct} min={10} max={800} step={1} onChange={handleZoomChange} />
          </div>
          <Button variant="ghost" onClick={() => zoomStep(10)}>
            +
          </Button>
          <span className="text-sm text-slate-600">{zoomPct}%</span>
        </div>
        {cropEnabled && crop && (
          <Button variant="primary" onClick={handleCropConfirm}>
            完成裁剪
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleExport}
          disabled={!rendererRef.current || rendererRef.current.state.layers.length === 0}
        >
          导出
        </Button>
        <div className="text-xs text-slate-500">{fileName ?? '未加载图片'}</div>
      </div>

      <div
        ref={containerRef}
        className={`canvas-stack ${isDragging ? 'dragging' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <canvas ref={bgCanvasRef} />
        <canvas ref={uiCanvasRef} className="ui-layer" onMouseDown={onCropMouseDown} />
        <div className="canvas-hint glass">
          {drawEnabled
            ? '绘图模式：在画布上按住鼠标左键并拖拽来绘制'
            : textEnabled
            ? '文本模式：在右侧面板输入文本并点击"添加文本"'
            : cropEnabled
            ? '裁剪模式：拖拽裁剪框来调整裁剪区域'
            : '点击图片选择图层 · 选中后拖拽移动 · 滚轮缩放视图'}
        </div>
      </div>
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
})

export { CanvasStage }

