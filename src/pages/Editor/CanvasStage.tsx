/**
 * Canvas画布舞台组件
 * 核心画布组件，负责图像渲染、缩放、平移、裁剪等交互功能
 * 使用双层Canvas架构：背景层渲染图像，UI层绘制交互元素
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { Toast } from '../../components/Toast'
import { createRenderer } from '../../canvas/engine'
import { drawStroke, createStroke } from '../../features/draw/draw.service'
import { addTextLayer, getDefaultTextConfig } from '../../features/text/text.service'
import { useCanvasResize } from '../../hooks/useCanvasResize'
import { useDrag } from '../../hooks/useDrag'
import { useKeyPress } from '../../hooks/useKeyPress'
import { exportImage } from '../../services/file.service'
import { debounce } from '../../utils/debounce'
import { mapRendererLayersToUI } from '../../utils/layer-utils'
import type {
  Renderer,
  EditorTool
} from '../../types'
import type { UILayer } from '../../types/layer'
import type { TextLayer, DrawPoint } from '../../types/tool'

// ==================== 类型定义 ====================

type Point = { x: number; y: number }
type CropHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
type CropState = { x: number; y: number; w: number; h: number; rotation: number }
type Hit = { mode: 'move' } | { mode: 'resize'; handle: CropHandle } | { mode: 'rotate' }

type Props = {
  cropEnabled: boolean
  /** 是否显示裁剪辅助线（九宫格），由外部控制 */
  cropGuidesVisible?: boolean
  drawEnabled?: boolean
  textEnabled?: boolean
  filterState: { brightness: number; contrast: number; saturation: number; hue: number; blur: number; sharpen: number }
  onFilterChange: (next: { brightness: number; contrast: number; saturation: number; hue: number; blur: number; sharpen: number }) => void
  onFileNameChange: (name: string | null) => void
  onTimeline: (text: string) => void
  onLayersChange?: (layers: UILayer[]) => void
  onCropChange?: (crop: CropState | null) => void
  onZoomChange?: (zoomPct: number) => void
  activeLayerId?: string | null
  onActiveLayerChange?: (id: string | null) => void
  onTextLayerCreated?: (layerId: string, config: Omit<TextLayer, 'id' | 'x' | 'y'>) => void
  textLayerMetadata?: { [layerId: string]: Omit<TextLayer, 'id' | 'x' | 'y'> }
  onUpdateTextLayer?: (layerId: string, config: Omit<TextLayer, 'id' | 'x' | 'y'>) => Promise<string | void>
  onTextLayerIdUpdate?: (oldLayerId: string, newLayerId: string) => void
  onSelectTool?: (tool: EditorTool) => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
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
    handleLayerOpacityChange?: (id: string, opacity: number) => void
    handleLayerBlendModeChange?: (id: string, blendMode: GlobalCompositeOperation) => void
    handleLayerLockedChange?: (id: string, locked: boolean) => void
    handleAddLayer?: () => void
    onTextLayerCreated?: (layerId: string, config: Omit<TextLayer, 'id' | 'x' | 'y'>) => void
  },
  Props
>(function CanvasStage({
  cropEnabled,
  cropGuidesVisible = true,
  drawEnabled = false,
  textEnabled = false,
  filterState,
  onFilterChange,
  onFileNameChange,
      onTimeline,
  onLayersChange,
  onCropChange,
      onZoomChange,
  activeLayerId,
  onActiveLayerChange,
  onTextLayerCreated,
  textLayerMetadata = {},
  onUpdateTextLayer,
  onTextLayerIdUpdate,
  onSelectTool,
  onUndo,
  onRedo,
  canUndo,
  canRedo
  }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  const uiCanvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<Renderer | null>(null)

  const [zoomPct, setZoomPct] = useState(100)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [crop, setCrop] = useState<CropState | null>(null)
  const updateCrop = useCallback(
    (next: CropState | null) => {
      setCrop(next)
      onCropChange?.(next)
    },
    [onCropChange]
  )
  const [drawColor, setDrawColor] = useState('#000000')
  const [drawSize, setDrawSize] = useState(5)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawPoints, setDrawPoints] = useState<DrawPoint[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isMovingLayer, setIsMovingLayer] = useState(false)
  const [movingLayerId, setMovingLayerId] = useState<string | null>(null)
  const [layerMoveStart, setLayerMoveStart] = useState<Point | null>(null)
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null)
  const [editingTextValue, setEditingTextValue] = useState('')
  const [editingTextPosition, setEditingTextPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const textInputRef = useRef<HTMLTextAreaElement>(null)
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastClickTime = useRef<number>(0)
  const lastClickLayerId = useRef<string | null>(null)
  const isUpdatingTextLayerRef = useRef<boolean>(false) // 标记是否正在更新文本图层
  
  // 统一延迟时间常量
  const TEXT_UPDATE_DELAY = 2000 // 文本图层更新完成后的延迟时间（ms）
  const DOUBLE_CLICK_DELAY = 300 // 双击检测延迟时间（ms）
  
  // 创建防抖的文本更新函数
  const debouncedTextUpdate = useRef(
    debounce(async (layerId: string, config: Omit<TextLayer, 'id' | 'x' | 'y'>) => {
      if (onUpdateTextLayer) {
        const newLayerId = await onUpdateTextLayer(layerId, config)
        // 如果返回了新图层ID，更新编辑状态
        if (newLayerId && newLayerId !== layerId) {
          // 标记正在更新，避免触发退出编辑模式的逻辑
          if (!isUpdatingTextLayerRef.current) {
            isUpdatingTextLayerRef.current = true
            setTimeout(() => {
              isUpdatingTextLayerRef.current = false
            }, TEXT_UPDATE_DELAY)
          }
          setEditingTextLayerId(newLayerId)
          // 通知父组件图层ID已更新
          onTextLayerIdUpdate?.(layerId, newLayerId)
        }
      }
    }, 500)
  ).current

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
    const z = Math.round(renderer.state.zoom * 100)
    setZoomPct(z)
    onZoomChange?.(z)
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
      // 增强背景遮罩的不透明度
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)'
      ctx.beginPath()
      ctx.rect(0, 0, t.vw, t.vh)
      ctx.moveTo(points[0].x, points[0].y)
      points.forEach((p, i) => {
        if (i === 0) return
        ctx.lineTo(p.x, p.y)
      })
      ctx.closePath()
      ctx.fill('evenodd')

      // 绘制外发光效果（外层边框）
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'
      ctx.lineWidth = 4
      ctx.setLineDash([])
      ctx.beginPath()
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      })
      ctx.closePath()
      ctx.stroke()

      // 绘制主边框（更粗更明显）
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 3
      ctx.setLineDash([8, 4])
      ctx.beginPath()
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      })
      ctx.closePath()
      ctx.stroke()
      
      // 绘制内层高光边框
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([8, 4])
      ctx.beginPath()
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      })
      ctx.closePath()
      ctx.stroke()
      ctx.setLineDash([])

      // 绘制九宫格辅助线（非常明显）
      if (cropEnabled && cropGuidesVisible) {
        // 计算九宫格线的位置（1/3 和 2/3 位置）
        const thirdW = crop.w / 3
        const thirdH = crop.h / 3
        
        // 两条垂直线（将宽度分成三等份）
        const verticalLine1 = toView({ x: -halfW + thirdW, y: -halfH })
        const verticalLine1End = toView({ x: -halfW + thirdW, y: halfH })
        const verticalLine2 = toView({ x: -halfW + thirdW * 2, y: -halfH })
        const verticalLine2End = toView({ x: -halfW + thirdW * 2, y: halfH })
        
        // 两条水平线（将高度分成三等份）
        const horizontalLine1 = toView({ x: -halfW, y: -halfH + thirdH })
        const horizontalLine1End = toView({ x: halfW, y: -halfH + thirdH })
        const horizontalLine2 = toView({ x: -halfW, y: -halfH + thirdH * 2 })
        const horizontalLine2End = toView({ x: halfW, y: -halfH + thirdH * 2 })
        
        // 绘制外发光效果（蓝色半透明）
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'
        ctx.lineWidth = 4
        ctx.setLineDash([8, 4])
        
        // 绘制垂直线外发光
        if (verticalLine1 && verticalLine1End) {
          ctx.beginPath()
          ctx.moveTo(verticalLine1.x, verticalLine1.y)
          ctx.lineTo(verticalLine1End.x, verticalLine1End.y)
          ctx.stroke()
        }
        if (verticalLine2 && verticalLine2End) {
          ctx.beginPath()
          ctx.moveTo(verticalLine2.x, verticalLine2.y)
          ctx.lineTo(verticalLine2End.x, verticalLine2End.y)
          ctx.stroke()
        }
        
        // 绘制水平线外发光
        if (horizontalLine1 && horizontalLine1End) {
          ctx.beginPath()
          ctx.moveTo(horizontalLine1.x, horizontalLine1.y)
          ctx.lineTo(horizontalLine1End.x, horizontalLine1End.y)
          ctx.stroke()
        }
        if (horizontalLine2 && horizontalLine2End) {
          ctx.beginPath()
          ctx.moveTo(horizontalLine2.x, horizontalLine2.y)
          ctx.lineTo(horizontalLine2End.x, horizontalLine2End.y)
          ctx.stroke()
        }
        
        // 绘制主线条（白色高亮）
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.lineWidth = 2
        ctx.setLineDash([8, 4])
        
        // 绘制垂直线主线条
        if (verticalLine1 && verticalLine1End) {
          ctx.beginPath()
          ctx.moveTo(verticalLine1.x, verticalLine1.y)
          ctx.lineTo(verticalLine1End.x, verticalLine1End.y)
          ctx.stroke()
        }
        if (verticalLine2 && verticalLine2End) {
          ctx.beginPath()
          ctx.moveTo(verticalLine2.x, verticalLine2.y)
          ctx.lineTo(verticalLine2End.x, verticalLine2End.y)
          ctx.stroke()
        }
        
        // 绘制水平线主线条
        if (horizontalLine1 && horizontalLine1End) {
          ctx.beginPath()
          ctx.moveTo(horizontalLine1.x, horizontalLine1.y)
          ctx.lineTo(horizontalLine1End.x, horizontalLine1End.y)
          ctx.stroke()
        }
        if (horizontalLine2 && horizontalLine2End) {
          ctx.beginPath()
          ctx.moveTo(horizontalLine2.x, horizontalLine2.y)
          ctx.lineTo(horizontalLine2End.x, horizontalLine2End.y)
          ctx.stroke()
        }
        
        ctx.setLineDash([])
      }

      const drawHandle = (p?: Point | null, size = 12) => {
        if (!p) return
        const half = size / 2
        // 绘制外发光
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
        ctx.beginPath()
        ctx.rect(p.x - half - 2, p.y - half - 2, size + 4, size + 4)
        ctx.fill()
        // 绘制主控制点
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.rect(p.x - half, p.y - half, size, size)
        ctx.fill()
        ctx.stroke()
        // 绘制内层高光
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.rect(p.x - half + 1, p.y - half + 1, size - 2, size - 2)
        ctx.stroke()
      }
      points.forEach((p) => drawHandle(p, 12))
      midPoints.forEach((p) => drawHandle(p, 10))

      if (rotateHandleView) {
        // 绘制旋转控制线（更明显）
        ctx.beginPath()
        ctx.moveTo(midPoints[0]!.x, midPoints[0]!.y)
        ctx.lineTo(rotateHandleView.x, rotateHandleView.y)
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.stroke()
        ctx.setLineDash([])

        // 绘制旋转控制点（更大更明显）
        // 外发光
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
        ctx.beginPath()
        ctx.arc(rotateHandleView.x, rotateHandleView.y, 10, 0, Math.PI * 2)
        ctx.fill()
        // 主控制点
        ctx.beginPath()
        ctx.arc(rotateHandleView.x, rotateHandleView.y, 8, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 2
        ctx.stroke()
        // 内层高光
        ctx.beginPath()
        ctx.arc(rotateHandleView.x, rotateHandleView.y, 6, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      ctx.restore()
      }
    })
    renderer.render()
  }, [crop, cropEnabled, activeLayerId, imageToView, getTransforms])

  // 检查图层是否锁定
  const checkLayerLocked = useCallback((id: string): boolean => {
    const renderer = rendererRef.current
    if (!renderer) return true
    const layer = renderer.getLayer(id)
    return layer?.locked === true
  }, [])

  const syncLayers = useCallback(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    const sizes = mapRendererLayersToUI(renderer.state.layers)
    // 直接同步到父组件，不再维护内部状态
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
      updateCrop({ x: (w - boxW) / 2, y: (h - boxH) / 2, w: boxW, h: boxH, rotation: 0 })
    } else {
      updateCrop(null)
      renderer.setOverlay(null)
      renderer.render()
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.cancelable) {
      e.preventDefault()
    }
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
    // 如果正在编辑文本，检查点击是否在输入框上
    if (editingTextLayerId) {
      // 检查点击是否在输入框上
      const target = e.target as HTMLElement
      if (target === textInputRef.current || textInputRef.current?.contains(target)) {
        // 点击在输入框上，不处理，保持编辑状态
        e.stopPropagation()
        return
      }
      // 点击在输入框外，退出编辑模式
      // 但只有在点击画布内（不是输入框）时才退出
      setEditingTextLayerId(null)
      setEditingTextPosition(null)
      // 继续处理点击事件（选择图层、拖拽等）
    }
    
    if (!rendererRef.current || rendererRef.current.state.layers.length === 0) {
      // 没有图层时，允许拖拽画布（无论是否处于裁剪模式）
      dragHandlers.onMouseDown(e)
      return
    }
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const viewPt = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    
    // 如果是绘图模式，开始绘制
    if (drawEnabled) {
      // 如果选中图层且被锁定，则不允许绘制
      if (activeLayerId && checkLayerLocked(activeLayerId)) {
        return
      }
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
      const renderer = rendererRef.current
      const layer = renderer?.getLayer(hitLayerId)
      const isTextLayer = layer && layer.name.startsWith('Text:')
      
      // 检测是否为双击（300ms内连续点击同一图层）
      const now = Date.now()
      const isDoubleClick = isTextLayer && 
        now - lastClickTime.current < 300 && 
        lastClickLayerId.current === hitLayerId
      
      // 如果是双击文本图层，直接进入编辑模式
      if (isDoubleClick && isTextLayer) {
        // 查找元数据：先通过图层ID，如果找不到则通过图层名称匹配
        let metadata = textLayerMetadata[hitLayerId]
        if (!metadata) {
          // 通过图层名称查找元数据（图层名称格式：Text: 文本内容）
          const layerName = layer?.name || ''
          const textContent = layerName.replace('Text: ', '')
          // 遍历所有元数据，找到匹配的
          for (const [metaLayerId, metaData] of Object.entries(textLayerMetadata)) {
            if (metaData.text === textContent) {
              metadata = metaData
              break
            }
          }
        }
        
        if (metadata) {
          e.preventDefault()
          e.stopPropagation()
          
          // 立即停止任何正在进行的拖拽
          setIsMovingLayer(false)
          setMovingLayerId(null)
          setLayerMoveStart(null)
          
          // 清除拖拽定时器
          if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current)
            dragTimeoutRef.current = null
          }
          
          // 重置点击记录，避免连续双击
          lastClickTime.current = 0
          lastClickLayerId.current = null
          
          setEditingTextValue(metadata.text)
          setEditingTextLayerId(hitLayerId)
          
          // 计算输入框位置
          const t = getTransforms()
          if (t && layer) {
            const { x, y } = layer.offset
            const { width: w, height: h } = layer.bitmap
            const scaledW = w * layer.scale * t.zoom
            const scaledH = h * layer.scale * t.zoom
            const centerView = imageToView({ x: x + w / 2, y: y + h / 2 })
            if (centerView) {
              setEditingTextPosition({
                x: centerView.x - scaledW / 2,
                y: centerView.y - scaledH / 2,
                width: scaledW,
                height: scaledH
              })
            }
          }
          
          // 延迟聚焦，确保DOM已更新
          setTimeout(() => {
            if (textInputRef.current) {
              textInputRef.current.focus()
              textInputRef.current.select()
            }
          }, 100)
          
          return
        }
      }
      
      // 立即记录点击并处理拖拽（文本图层不再等待双击）
      lastClickTime.current = now
      lastClickLayerId.current = hitLayerId
      
      // 如果点击的是已选中的图层，开始拖拽移动
      if (hitLayerId === activeLayerId && !cropEnabled) {
        // 检查图层是否被锁定
        if (checkLayerLocked(hitLayerId)) {
          // 锁定图层不能移动
          return
        }
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
      // 点击在空白处，允许拖拽画布（裁剪模式下也可以平移视图）
      dragHandlers.onMouseDown(e)
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
    [drawEnabled, isDrawing, isMovingLayer, movingLayerId, layerMoveStart, viewToImage, editingTextLayerId]
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
      if (activeLayerId && checkLayerLocked(activeLayerId)) {
        setDrawPoints([])
        setIsDrawing(false)
        return
      }
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
    if (!renderer || !crop) return
    const targetLayerId =
      activeLayerId || renderer.state.layers[renderer.state.layers.length - 1]?.id
    if (!targetLayerId) return

    await renderer.applyCrop(crop, targetLayerId)
    const { w, h } = renderer.state.imgSize
    const boxW = w * 0.8
    const boxH = h * 0.8
    updateCrop({ x: (w - boxW) / 2, y: (h - boxH) / 2, w: boxW, h: boxH, rotation: 0 })
    renderer.fitToView()
    syncZoom()
    onTimeline('裁剪完成')
    // 完成裁剪后退出裁剪模式
    onSelectTool?.(null)
  }, [crop, activeLayerId, onTimeline, onSelectTool])

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
        
        // addTextLayer 需要 Omit<TextLayer, 'id'>，所以不需要传递 id
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
      if (checkLayerLocked(id)) return // 锁定图层不能删除
      const layerName = renderer.state.layers.find((l) => l.id === id)?.name || id
      renderer.deleteLayer(id)
      syncLayers()
      
      // 如果删除的是正在编辑的文本图层，清理编辑状态
      if (id === editingTextLayerId) {
        setEditingTextLayerId(null)
        setEditingTextPosition(null)
        setEditingTextValue('')
      }
      
      // 如果删除的是当前激活的图层，切换到其他图层
      if (id === activeLayerId) {
        const remainingLayers = renderer.state.layers
        onActiveLayerChange?.(remainingLayers.length > 0 ? remainingLayers[remainingLayers.length - 1].id : null)
      }
      onTimeline(`删除图层：${layerName}`)
    },
    [syncLayers, onTimeline, activeLayerId, onActiveLayerChange, checkLayerLocked, editingTextLayerId]
  )

  // 快捷键：Delete 删除选中图层（编辑文本时不触发）
  useKeyPress('Delete', () => {
    if (editingTextLayerId) return
    if (activeLayerId) {
      handleLayerDelete(activeLayerId)
    }
  })

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
      if (checkLayerLocked(id)) return // 锁定图层不能复制
      renderer.duplicateLayer(id)
      syncLayers()
      onTimeline('复制图层')
    },
    [syncLayers, onTimeline, checkLayerLocked]
  )

  const handleLayerRename = useCallback(
    (id: string, newName: string) => {
      const renderer = rendererRef.current
      if (!renderer) return
      if (checkLayerLocked(id)) return
      renderer.renameLayer(id, newName.trim() || '未命名图层')
      syncLayers()
      onTimeline(`重命名图层：${newName}`)
    },
    [syncLayers, onTimeline, checkLayerLocked]
  )

  const handleLayerAlignCenter = useCallback(
    (id: string) => {
      const renderer = rendererRef.current
      if (!renderer) return
      if (checkLayerLocked(id)) return
      const layer = renderer.getLayer(id)
      if (!layer) return
      const { w: imgW, h: imgH } = renderer.state.imgSize
      const offset = {
        x: (imgW - layer.bitmap.width) / 2,
        y: (imgH - layer.bitmap.height) / 2
      }
      renderer.setLayerOffset(id, offset)
      syncLayers()
      onTimeline('图层居中')
    },
    [syncLayers, onTimeline, checkLayerLocked]
  )

  const handleLayerScaleChange = useCallback((id: string, scale: number) => {
    const renderer = rendererRef.current
    if (!renderer) return
    if (checkLayerLocked(id)) return // 锁定图层不能缩放
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
    if (checkLayerLocked(id)) return // 锁定图层不能旋转
    renderer.setLayerRotation(id, rotation)
    syncLayers()
    // 不在拖动过程中记录，只在拖动结束时记录
  }, [syncLayers, checkLayerLocked])

  const handleLayerRotationChangeEnd = useCallback((id: string, rotation: number) => {
    onTimeline(`调整图层旋转: ${Math.round(rotation)}°`)
  }, [onTimeline])

  const handleLayerOpacityChange = useCallback((id: string, opacity: number) => {
    const renderer = rendererRef.current
    if (!renderer) return
    if (checkLayerLocked(id)) return // 锁定图层不能调整不透明度
    renderer.setLayerOpacity(id, opacity)
    syncLayers()
    onTimeline(`调整图层不透明度: ${Math.round(opacity * 100)}%`)
  }, [syncLayers, onTimeline, checkLayerLocked])

  const handleLayerBlendModeChange = useCallback((id: string, blendMode: GlobalCompositeOperation) => {
    const renderer = rendererRef.current
    if (!renderer) return
    if (checkLayerLocked(id)) return // 锁定图层不能调整混合模式
    renderer.setLayerBlendMode(id, blendMode)
    syncLayers()
    onTimeline(`调整图层混合模式: ${blendMode}`)
  }, [syncLayers, onTimeline, checkLayerLocked])

  const handleLayerLockedChange = useCallback((id: string, locked: boolean) => {
    const renderer = rendererRef.current
    if (!renderer) return
    renderer.setLayerLocked(id, locked)
    syncLayers()
    onTimeline(locked ? '锁定图层' : '解锁图层')
  }, [syncLayers, onTimeline])

  const handleAddLayer = useCallback(async () => {
    const renderer = rendererRef.current
    if (!renderer) return
    
    // 创建空白图层，使用当前图像尺寸或默认尺寸
    const { w, h } = renderer.state.imgSize
    const width = w > 0 ? w : 800
    const height = h > 0 ? h : 600
    
    try {
      await renderer.addEmptyLayer(width, height)
      syncLayers()
      onTimeline('添加空白图层')
    } catch (error) {
      console.error('添加图层失败:', error)
    }
  }, [syncLayers, onTimeline])

  const applyCrop = useCallback(
    (next: CropState | null) => {
      updateCrop(next)
      rendererRef.current?.render()
    },
    [updateCrop]
  )

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
      handleLayerOpacityChange: handleLayerOpacityChange,
      handleLayerBlendModeChange: handleLayerBlendModeChange,
      handleLayerLockedChange: handleLayerLockedChange,
      handleAddLayer: handleAddLayer,
      handleLayerRename: handleLayerRename,
      handleLayerAlignCenter: handleLayerAlignCenter,
      handleLayerScaleChange: handleLayerScaleChange,
      handleLayerScaleChangeEnd: handleLayerScaleChangeEnd,
      handleLayerRotationChange: handleLayerRotationChange,
      handleLayerRotationChangeEnd: handleLayerRotationChangeEnd,
      getRenderer: () => rendererRef.current,
      getCrop: () => crop,
      setCrop: applyCrop
    }),
    [handleAddText, handleCropConfirm, handleLayerDelete, handleLayerVisibilityToggle, handleLayerMove, handleLayerDuplicate, handleLayerRename, handleLayerAlignCenter, handleLayerScaleChange, handleLayerScaleChangeEnd, handleLayerRotationChange, handleLayerRotationChangeEnd, handleLayerOpacityChange, handleLayerBlendModeChange, handleLayerLockedChange, handleAddLayer, crop, applyCrop]
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

  // 当activeLayerId变化时，更新overlay显示
  useEffect(() => {
    updateOverlay()
  }, [activeLayerId, updateOverlay])

  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    if (!cropEnabled) {
      updateCrop(null)
      updateOverlay()
      return
    }
    if (renderer.state.layers.length && !crop) {
      const { w, h } = renderer.state.imgSize
      const boxW = w * 0.6
      const boxH = h * 0.6
      updateCrop({ x: (w - boxW) / 2, y: (h - boxH) / 2, w: boxW, h: boxH, rotation: 0 })
    }
  }, [cropEnabled, crop, updateOverlay, updateCrop])

  // 当编辑文本图层时，更新输入框位置（当缩放或平移时）
  // 同时检查图层ID是否变化（当文本更新时，图层会被重新创建，ID会变化）
  useEffect(() => {
    if (!editingTextLayerId || !rendererRef.current) return
    
    const renderer = rendererRef.current
    let currentLayerId = editingTextLayerId
    let layer = renderer.getLayer(editingTextLayerId)
    
    // 如果图层不存在，尝试通过文本内容查找新图层
    if (!layer) {
      const metadata = textLayerMetadata[editingTextLayerId]
      if (metadata) {
        // 通过文本内容查找新图层（查找最新的匹配图层）
        const matchingLayers = renderer.state.layers.filter((l) => 
          l.name.startsWith('Text:') && l.name.includes(metadata.text.substring(0, Math.min(10, metadata.text.length)))
        )
        // 使用最后一个匹配的图层（最新的）
        if (matchingLayers.length > 0) {
          const matchingLayer = matchingLayers[matchingLayers.length - 1]
          if (matchingLayer.id !== editingTextLayerId) {
            // 更新编辑中的图层ID
            currentLayerId = matchingLayer.id
            layer = matchingLayer
            // 标记正在更新，避免触发退出编辑模式的逻辑
            // 如果已经设置了标记，不重复设置（避免重置时间冲突）
            if (!isUpdatingTextLayerRef.current) {
              isUpdatingTextLayerRef.current = true
              // 延迟重置标记，确保更新完成
              setTimeout(() => {
                isUpdatingTextLayerRef.current = false
              }, TEXT_UPDATE_DELAY)
            }
            setEditingTextLayerId(matchingLayer.id)
          }
        }
      }
      if (!layer) return
    }
    
    const t = getTransforms()
    if (!t) return
    
    const { x, y } = layer.offset
    const { width: w, height: h } = layer.bitmap
    const scaledW = w * layer.scale * t.zoom
    const scaledH = h * layer.scale * t.zoom
    const centerView = imageToView({ x: x + w / 2, y: y + h / 2 })
    if (centerView) {
      setEditingTextPosition({
        x: centerView.x - scaledW / 2,
        y: centerView.y - scaledH / 2,
        width: scaledW,
        height: scaledH
      })
    }
  }, [editingTextLayerId, zoomPct, textLayerMetadata])

  // 当切换图层时，如果正在编辑文本，退出编辑模式
  // 但如果正在更新文本图层（isUpdatingTextLayerRef.current），则不退出
  useEffect(() => {
    // 如果正在更新文本图层，跳过检查
    if (isUpdatingTextLayerRef.current) {
      return
    }
    
    if (editingTextLayerId && activeLayerId && editingTextLayerId !== activeLayerId) {
      // 检查新选中的图层是否是文本图层
      const renderer = rendererRef.current
      if (renderer) {
        const newLayer = renderer.getLayer(activeLayerId)
        // 如果新图层不是文本图层，或者不是正在编辑的图层，退出编辑模式
        if (!newLayer || !newLayer.name.startsWith('Text:') || newLayer.id !== editingTextLayerId) {
          setEditingTextLayerId(null)
          setEditingTextPosition(null)
        }
      }
    }
  }, [activeLayerId, editingTextLayerId])

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
      <div
        ref={containerRef}
        className={`canvas-stack ${isDragging ? 'dragging' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        // 移除 onDoubleClick，使用 handleMouseDown 中的手动双击检测
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <canvas ref={bgCanvasRef} />
        <canvas ref={uiCanvasRef} className="ui-layer" onMouseDown={onCropMouseDown} />
        
        {/* 文本编辑输入框 */}
        {editingTextLayerId && editingTextPosition && (() => {
          // 查找元数据：先通过图层ID，如果找不到则通过图层名称匹配
          let metadata = textLayerMetadata[editingTextLayerId]
          if (!metadata && rendererRef.current) {
            const layer = rendererRef.current.getLayer(editingTextLayerId)
            if (layer && layer.name.startsWith('Text:')) {
              const layerName = layer.name
              const textContent = layerName.replace('Text: ', '')
              // 遍历所有元数据，找到匹配的（使用最新的文本内容）
              for (const [metaLayerId, metaData] of Object.entries(textLayerMetadata)) {
                // 匹配文本内容（允许部分匹配，因为图层名称可能被截断）
                if (metaData.text.trim() === textContent.trim() || 
                    textContent.trim().startsWith(metaData.text.trim().substring(0, Math.min(10, metaData.text.length)))) {
                  metadata = metaData
                  // 如果图层ID变化了，更新编辑中的图层ID（使用 setTimeout 避免在渲染过程中更新状态）
                  if (metaLayerId !== editingTextLayerId) {
                    // 标记正在更新，避免触发退出编辑模式的逻辑
                    // 如果已经设置了标记，不重复设置（避免重置时间冲突）
                    if (!isUpdatingTextLayerRef.current) {
                      isUpdatingTextLayerRef.current = true
                      // 延迟重置标记，确保更新完成（统一使用2000ms）
                      setTimeout(() => {
                        isUpdatingTextLayerRef.current = false
                      }, 2000)
                    }
                    setTimeout(() => {
                      setEditingTextLayerId(metaLayerId)
                    }, 0)
                  }
                  break
                }
              }
            }
          }
          // 如果还是找不到元数据，但正在编辑，使用 editingTextValue 作为后备
          if (!metadata && editingTextValue) {
            // 创建一个临时元数据对象（完整字段），避免类型缺失
            const defaults = getDefaultTextConfig()
            metadata = {
              ...defaults,
              text: editingTextValue || ' '
            }
          }
          return metadata
        })() && (
          <textarea
            ref={textInputRef}
            value={editingTextValue}
            onChange={(e) => {
              const newValue = e.target.value
              setEditingTextValue(newValue)
              
              // 自动调整输入框高度以适应内容
              if (textInputRef.current) {
                textInputRef.current.style.height = 'auto'
                textInputRef.current.style.height = `${Math.max(textInputRef.current.scrollHeight, editingTextPosition.height)}px`
              }
              
              // 实时更新文本图层
              // 使用当前的 editingTextLayerId 查找元数据
              let currentLayerId = editingTextLayerId
              let metadata = textLayerMetadata[editingTextLayerId]
              
              // 如果找不到元数据，尝试通过图层名称查找
              if (!metadata && rendererRef.current) {
                const layer = rendererRef.current.getLayer(editingTextLayerId)
                if (layer && layer.name.startsWith('Text:')) {
                  const layerName = layer.name
                  const textContent = layerName.replace('Text: ', '')
                  // 遍历所有元数据，找到匹配的（使用最新的文本内容）
                  for (const [metaLayerId, metaData] of Object.entries(textLayerMetadata)) {
                    // 匹配文本内容（允许部分匹配，因为图层名称可能被截断）
                    if (metaData.text.trim() === textContent.trim() || 
                        textContent.trim().startsWith(metaData.text.trim().substring(0, Math.min(10, metaData.text.length)))) {
                      metadata = metaData
                      currentLayerId = metaLayerId
                      // 如果图层ID变化了，更新编辑中的图层ID（但不退出编辑状态）
                      if (metaLayerId !== editingTextLayerId) {
                        // 标记正在更新，避免触发退出编辑模式的逻辑
                        // 如果已经设置了标记，不重复设置（避免重置时间冲突）
                        if (!isUpdatingTextLayerRef.current) {
                          isUpdatingTextLayerRef.current = true
                          // 延迟重置标记，确保更新完成（统一使用2000ms）
                          setTimeout(() => {
                            isUpdatingTextLayerRef.current = false
                          }, 2000)
                        }
                        // 使用 setTimeout 避免在渲染过程中更新状态，保持编辑状态
                        setTimeout(() => {
                          setEditingTextLayerId(metaLayerId)
                        }, 0)
                      }
                      break
                    }
                  }
                }
              }
              
              if (metadata) {
                const newConfig = {
                  ...metadata,
                  text: newValue || ' '
                }
                // 标记正在更新文本图层
                // 如果已经设置了标记，不重复设置（避免重置时间冲突）
                if (!isUpdatingTextLayerRef.current) {
                  isUpdatingTextLayerRef.current = true
                  // 延迟重置标记，给更新完成的时间（防抖500ms + 更新操作时间）
                  setTimeout(() => {
                    isUpdatingTextLayerRef.current = false
                  }, 2000) // 2秒后重置，确保防抖和更新都完成
                }
                debouncedTextUpdate(currentLayerId, newConfig)
              }
            }}
            onMouseDown={(e) => {
              // 阻止事件冒泡，防止触发容器的 handleMouseDown
              e.stopPropagation()
            }}
            onBlur={(e) => {
              // 不立即退出编辑模式
              // 只有在以下情况才退出：
              // 1. 点击画布其他地方（由 handleMouseDown 处理）
              // 2. 按 Enter 键（由 onKeyDown 处理）
              // 3. 切换图层（由 onActiveLayerChange 处理）
              // 这里不做任何操作，让其他事件处理器来决定是否退出
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                // ESC键退出编辑模式
                setEditingTextLayerId(null)
                setEditingTextPosition(null)
                textInputRef.current?.blur()
              } else if (e.key === 'Enter' && !e.shiftKey) {
                // Enter键（非Shift+Enter）退出编辑模式
                e.preventDefault()
                setEditingTextLayerId(null)
                setEditingTextPosition(null)
                textInputRef.current?.blur()
              }
            }}
            style={{
              position: 'absolute',
              left: `${editingTextPosition.x}px`,
              top: `${editingTextPosition.y}px`,
              width: `${Math.max(editingTextPosition.width, 200)}px`, // 最小宽度200px
              minWidth: '200px',
              minHeight: '40px',
              maxWidth: 'none', // 不限制最大宽度
              maxHeight: 'none', // 不限制最大高度
              padding: '4px 8px',
              border: '2px solid #3b82f6',
              borderRadius: '4px',
              fontSize: `${textLayerMetadata[editingTextLayerId]?.fontSize || 24}px`,
              fontFamily: textLayerMetadata[editingTextLayerId]?.fontFamily || 'system-ui, -apple-system, sans-serif',
              fontWeight: textLayerMetadata[editingTextLayerId]?.bold ? 'bold' : 'normal',
              fontStyle: textLayerMetadata[editingTextLayerId]?.italic ? 'italic' : 'normal',
              color: textLayerMetadata[editingTextLayerId]?.color || '#000000',
              textAlign: textLayerMetadata[editingTextLayerId]?.align || 'left',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              resize: 'both', // 允许调整大小
              overflow: 'auto', // 允许滚动
              overflowWrap: 'break-word', // 允许单词换行
              wordWrap: 'break-word', // 允许单词换行
              whiteSpace: 'pre-wrap', // 保留空格和换行，允许自动换行
              zIndex: 1000,
              outline: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            className="text-edit-input"
          />
        )}
        
        <div className="canvas-hint glass">
          {drawEnabled
            ? '绘图模式：在画布上按住鼠标左键并拖拽来绘制'
            : textEnabled
            ? '文本模式：在右侧面板输入文本并点击"添加文本"，或双击文本图层直接编辑'
            : cropEnabled
            ? '裁剪模式：拖拽裁剪框来调整裁剪区域'
            : '点击图片选择图层 · 双击文本图层编辑 · 选中后拖拽移动 · 滚轮缩放视图'}
        </div>
      </div>
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
})

export { CanvasStage }

