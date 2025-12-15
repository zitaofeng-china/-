/**
 * Canvas渲染器
 * 提供图像渲染、缩放、平移、裁剪、滤镜等核心功能
 * 使用双层Canvas架构：背景层用于渲染图像，UI层用于绘制交互元素
 */

// ==================== 类型定义 ====================

export type Vec2 = { x: number; y: number }

export type FilterState = { 
  brightness: number
  contrast: number
  saturation: number
  hue: number
  blur: number
  sharpen: number
}

export type Layer = { 
  id: string
  name: string
  bitmap: ImageBitmap
  offset: Vec2
  visible: boolean
  /** 图层缩放比例，默认1 */
  scale: number
  /** 图层旋转角度（度），默认0 */
  rotation: number
  /** 图层不透明度，0-1，默认1 */
  opacity: number
  /** 图层混合模式，默认 'normal' */
  blendMode: GlobalCompositeOperation
  /** 图层是否锁定，默认 false */
  locked: boolean
}

type CropRect = { x: number; y: number; w: number; h: number; rotation: number }

// ==================== 工具函数 ====================

/**
 * 限制数值在指定范围内
 */
const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max)

export type Renderer = ReturnType<typeof createRenderer>

export function createRenderer(backgroundCanvas: HTMLCanvasElement, uiCanvas: HTMLCanvasElement) {
  const state = {
    layers: [] as Layer[],
    zoom: 1,
    offset: { x: 0, y: 0 } as Vec2,
    view: { w: 0, h: 0 },
    imgSize: { w: 0, h: 0 },
    filter: { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sharpen: 0 } as FilterState
  }

  const dpr = window.devicePixelRatio || 1
  const bgCtx = backgroundCanvas.getContext('2d')!
  const uiCtx = uiCanvas.getContext('2d')!
  let overlayDrawer: ((ctx: CanvasRenderingContext2D, helpers: { view: { w: number; h: number } }) => void) | null =
    null

  function setSize(width: number, height: number) {
    state.view = { w: width, h: height }
    const scaledW = Math.max(1, Math.floor(width * dpr))
    const scaledH = Math.max(1, Math.floor(height * dpr))
    backgroundCanvas.width = scaledW
    backgroundCanvas.height = scaledH
    backgroundCanvas.style.width = `${width}px`
    backgroundCanvas.style.height = `${height}px`

    uiCanvas.width = scaledW
    uiCanvas.height = scaledH
    uiCanvas.style.width = `${width}px`
    uiCanvas.style.height = `${height}px`

    render()
  }

  function recomputeSize() {
    if (!state.layers.length) {
      state.imgSize = { w: 0, h: 0 }
      return
    }
    const maxW = Math.max(...state.layers.map((l) => l.bitmap.width))
    const maxH = Math.max(...state.layers.map((l) => l.bitmap.height))
    state.imgSize = { w: maxW, h: maxH }
  }

  function fitToView() {
    if (!state.layers.length) return
    const { w: vw, h: vh } = state.view
    const { w: iw, h: ih } = state.imgSize
    const scale = Math.min(vw / iw, vh / ih) * 0.9
    state.zoom = scale || 1
    state.offset = { x: 0, y: 0 }
    render()
  }

  async function addImage(file: File, name?: string, offset?: Vec2) {
    const bitmap = await createImageBitmap(file)
    
    // 如果没有指定offset且已有图层，自动错开位置
    let layerOffset: Vec2 = offset || { x: 0, y: 0 }
    if (!offset && state.layers.length > 0) {
      // 计算偏移量，让新图层错开显示
      // 使用一个螺旋模式或网格模式来放置图层
      const layerIndex = state.layers.length
      const spacing = 50 // 图层间距
      const gridSize = Math.ceil(Math.sqrt(layerIndex + 1))
      const row = Math.floor(layerIndex / gridSize)
      const col = layerIndex % gridSize
      layerOffset = {
        x: (col - (gridSize - 1) / 2) * spacing,
        y: (row - (gridSize - 1) / 2) * spacing
      }
    }
    
    const layer: Layer = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: name || file.name || 'layer',
      bitmap,
      offset: layerOffset,
      visible: true,
      scale: 1,
      rotation: 0,
      opacity: 1,
      blendMode: 'source-over',
      locked: false
    }
    state.layers.push(layer)
    recomputeSize()
    // 添加新图层时不自动fitToView，保持当前视图状态
    render()
  }

  async function loadImage(file: File) {
    state.layers.forEach((l) => l.bitmap.close?.())
    state.layers = []
    await addImage(file)
  }

  function zoomTo(newZoom: number, pointer?: Vec2) {
    newZoom = clamp(newZoom, 0.1, 8)
    const { w, h } = state.view
    const center = { x: w / 2, y: h / 2 }
    if (pointer && state.layers.length) {
      const { zoom, offset } = state
      const delta = { x: pointer.x - center.x - offset.x, y: pointer.y - center.y - offset.y }
      state.offset = {
        x: offset.x + delta.x * (1 - newZoom / zoom),
        y: offset.y + delta.y * (1 - newZoom / zoom)
      }
    }
    state.zoom = newZoom
    render()
  }

  function zoomBy(delta: number, pointer?: Vec2) {
    const factor = 1 - delta * 0.001
    zoomTo(state.zoom * factor, pointer)
  }

  function pan(dx: number, dy: number) {
    state.offset.x += dx
    state.offset.y += dy
    render()
  }

  async function applyCrop(rect: CropRect, targetLayerId?: string) {
    if (!state.layers.length) return
    const target = targetLayerId
      ? state.layers.find((l) => l.id === targetLayerId)
      : state.layers[state.layers.length - 1]
    if (!target) return
    
    // 创建一个canvas来容纳裁剪后的图像
    const off = document.createElement('canvas')
    off.width = Math.max(1, Math.floor(rect.w))
    off.height = Math.max(1, Math.floor(rect.h))
    const ctx = off.getContext('2d')
    if (!ctx) return
    
    // 计算裁剪区域相对于图层的位置
    // 裁剪rect是在图像坐标系中的，需要转换到图层坐标系
    const cropX = rect.x
    const cropY = rect.y
    
    // 图层在图像坐标系中的位置
    const layerX = target.offset.x
    const layerY = target.offset.y
    
    // 计算裁剪区域在图层中的相对位置
    // 先计算图层中心在图像坐标系中的位置
    const layerCenterX = layerX + target.bitmap.width / 2
    const layerCenterY = layerY + target.bitmap.height / 2
    
    // 裁剪区域中心
    const cropCenterX = cropX + rect.w / 2
    const cropCenterY = cropY + rect.h / 2
    
    // 从图层中心到裁剪区域中心的偏移（考虑图层变换）
    const dx = cropCenterX - layerCenterX
    const dy = cropCenterY - layerCenterY
    
    // 应用图层旋转（反向）
    const rad = (-target.rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const localDx = dx * cos - dy * sin
    const localDy = dx * sin + dy * cos
    
    // 裁剪区域在图层局部坐标系中的位置和尺寸（需要考虑缩放）
    const cropLocalX = (target.bitmap.width / 2) + (localDx / target.scale) - (rect.w / 2 / target.scale)
    const cropLocalY = (target.bitmap.height / 2) + (localDy / target.scale) - (rect.h / 2 / target.scale)
    const cropLocalW = rect.w / target.scale
    const cropLocalH = rect.h / target.scale
    
    // 绘制裁剪区域
    ctx.save()
    ctx.translate(off.width / 2, off.height / 2)
    ctx.rotate((rect.rotation * Math.PI) / 180)
    
    // 先应用图层的旋转，然后绘制
    ctx.save()
    ctx.rotate((target.rotation * Math.PI) / 180)
    ctx.drawImage(
      target.bitmap,
      cropLocalX,
      cropLocalY,
      cropLocalW,
      cropLocalH,
      -off.width / 2,
      -off.height / 2,
      off.width,
      off.height
    )
    ctx.restore()
    
    ctx.restore()
    
    const newBitmap = await createImageBitmap(off)
    target.bitmap.close?.()
    target.bitmap = newBitmap
    target.offset = { x: 0, y: 0 }
    target.scale = 1
    target.rotation = 0
    recomputeSize()
    state.offset = { x: 0, y: 0 }
    state.zoom = 1
    overlayDrawer = null
    render()
  }

  function render() {
    const { w, h } = state.view
    bgCtx.save()
    uiCtx.save()
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    uiCtx.setTransform(dpr, 0, 0, dpr, 0, 0)

    bgCtx.clearRect(0, 0, w, h)
    uiCtx.clearRect(0, 0, w, h)

    if (state.layers.length) {
      const { zoom, offset } = state
      const drawW = state.imgSize.w * zoom
      const drawH = state.imgSize.h * zoom
      const cx = w / 2 + offset.x
      const cy = h / 2 + offset.y
      const x = cx - drawW / 2
      const y = cy - drawH / 2
      
      // 清空画布，让 CSS 背景的棋盘格显示出来
      bgCtx.clearRect(0, 0, w, h)
      
      // 构建滤镜字符串
      const { brightness, contrast, saturation, hue, blur, sharpen } = state.filter
      const filters: string[] = []
      if (brightness !== 100) filters.push(`brightness(${brightness}%)`)
      // 锐化和对比度结合：锐化通过增加对比度来实现
      const effectiveContrast = sharpen > 0 
        ? contrast + (sharpen / 100) * 20 
        : contrast
      if (effectiveContrast !== 100) filters.push(`contrast(${effectiveContrast}%)`)
      if (saturation !== 100) filters.push(`saturate(${saturation}%)`)
      if (hue !== 0) filters.push(`hue-rotate(${hue}deg)`)
      if (blur > 0) filters.push(`blur(${blur}px)`)
      
      // 应用滤镜到所有可见图层
      state.layers.forEach((layer) => {
        if (!layer.visible) return
        
        // 为每个图层单独应用滤镜（确保滤镜正确应用）
        bgCtx.save()
        bgCtx.filter = filters.length > 0 ? filters.join(' ') : 'none'
        // 应用图层不透明度
        bgCtx.globalAlpha = layer.opacity
        // 应用图层混合模式
        bgCtx.globalCompositeOperation = layer.blendMode
        // 计算图层在图像坐标系中的位置（考虑offset）
        const layerX = layer.offset.x
        const layerY = layer.offset.y
        const layerW = layer.bitmap.width
        const layerH = layer.bitmap.height
        
        // 计算图层中心在图像坐标系中的位置
        const layerCenterX = layerX + layerW / 2
        const layerCenterY = layerY + layerH / 2
        
        // 转换到视图坐标系
        const viewCenterX = x + layerCenterX * zoom
        const viewCenterY = y + layerCenterY * zoom
        
        // 计算缩放后的尺寸
        const scaledW = layerW * layer.scale * zoom
        const scaledH = layerH * layer.scale * zoom
        
        // 应用图层变换（旋转和缩放）
        bgCtx.translate(viewCenterX, viewCenterY)
        bgCtx.rotate((layer.rotation * Math.PI) / 180)
        bgCtx.drawImage(layer.bitmap, -scaledW / 2, -scaledH / 2, scaledW, scaledH)
        bgCtx.restore() // 恢复滤镜和变换状态
      })
    } else {
      // 清空画布，让 CSS 背景的棋盘格显示出来
      bgCtx.clearRect(0, 0, w, h)
      
      uiCtx.fillStyle = '#94a3b8'
      uiCtx.font = '14px system-ui'
      uiCtx.textAlign = 'center'
      uiCtx.fillText('请先上传一张图片', w / 2, h / 2)
    }

    if (overlayDrawer) {
      overlayDrawer(uiCtx, { view: state.view })
    }

    bgCtx.restore()
    uiCtx.restore()
  }

  function destroy() {
    state.layers.forEach((l) => l.bitmap.close?.())
    state.layers = []
  }

  function setOverlay(drawer: typeof overlayDrawer) {
    overlayDrawer = drawer
    render()
  }

  function setFilter(next: FilterState) {
    state.filter = next
    render()
  }

  function setLayerVisibility(id: string, visible: boolean) {
    const layer = state.layers.find((l) => l.id === id)
    if (!layer) return
    layer.visible = visible
    render()
  }

  function moveLayer(id: string, direction: 'up' | 'down') {
    const idx = state.layers.findIndex((l) => l.id === id)
    if (idx === -1) return
    const target = direction === 'up' ? idx + 1 : idx - 1
    if (target < 0 || target >= state.layers.length) return
    ;[state.layers[idx], state.layers[target]] = [state.layers[target], state.layers[idx]]
    render()
  }

  function moveLayerOffset(id: string, dx: number, dy: number) {
    const layer = state.layers.find((l) => l.id === id)
    if (!layer) return
    layer.offset.x += dx
    layer.offset.y += dy
    render()
  }

  function setLayerOffset(id: string, offset: Vec2) {
    const layer = state.layers.find((l) => l.id === id)
    if (!layer) return
    layer.offset = { ...offset }
    render()
  }

  function setLayerScale(id: string, scale: number) {
    const layer = state.layers.find((l) => l.id === id)
    if (!layer) return
    layer.scale = clamp(scale, 0.1, 5) // 限制缩放范围在0.1到5倍之间
    render()
  }

  function setLayerRotation(id: string, rotation: number) {
    const layer = state.layers.find((l) => l.id === id)
    if (!layer) return
    layer.rotation = rotation % 360 // 归一化角度
    render()
  }

  function setLayerOpacity(id: string, opacity: number) {
    const layer = state.layers.find((l) => l.id === id)
    if (!layer) return
    layer.opacity = clamp(opacity, 0, 1)
    render()
  }

  function setLayerBlendMode(id: string, blendMode: GlobalCompositeOperation) {
    const layer = state.layers.find((l) => l.id === id)
    if (!layer) return
    layer.blendMode = blendMode
    render()
  }

  function setLayerLocked(id: string, locked: boolean) {
    const layer = state.layers.find((l) => l.id === id)
    if (!layer) return
    layer.locked = locked
    render()
  }

  async function addEmptyLayer(width: number, height: number, name?: string, offset?: Vec2) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 创建透明画布
    ctx.clearRect(0, 0, width, height)
    
    const bitmap = await createImageBitmap(canvas)
    const layerOffset: Vec2 = offset || { x: 0, y: 0 }
    
    const layer: Layer = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: name || `图层 ${state.layers.length + 1}`,
      bitmap,
      offset: layerOffset,
      visible: true,
      scale: 1,
      rotation: 0,
      opacity: 1,
      blendMode: 'source-over',
      locked: false
    }
    state.layers.push(layer)
    recomputeSize()
    render()
    return layer.id
  }

  function getLayer(id: string) {
    return state.layers.find((l) => l.id === id)
  }

  function deleteLayer(id: string) {
    const idx = state.layers.findIndex((l) => l.id === id)
    if (idx === -1) return
    const layer = state.layers[idx]
    layer.bitmap.close?.()
    state.layers.splice(idx, 1)
    recomputeSize()
    render()
  }

  function duplicateLayer(id: string) {
    const layer = state.layers.find((l) => l.id === id)
    if (!layer) return
    // 创建新的bitmap副本
    const canvas = document.createElement('canvas')
    canvas.width = layer.bitmap.width
    canvas.height = layer.bitmap.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(layer.bitmap, 0, 0)
    createImageBitmap(canvas).then((newBitmap) => {
      const newLayer: Layer = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: `${layer.name} 副本`,
        bitmap: newBitmap,
        offset: { ...layer.offset },
        visible: layer.visible,
        scale: layer.scale,
        rotation: layer.rotation,
        opacity: layer.opacity,
        blendMode: layer.blendMode,
        locked: false
      }
      state.layers.push(newLayer)
      recomputeSize()
      render()
    })
  }

  function renameLayer(id: string, newName: string) {
    const layer = state.layers.find((l) => l.id === id)
    if (!layer) return
    layer.name = newName
    render()
  }

  function setView(next: { zoom: number; offset: Vec2 }) {
    state.zoom = clamp(next.zoom, 0.1, 8)
    state.offset = { ...next.offset }
    render()
  }

  return {
    setSize,
    loadImage,
    zoomTo,
    zoomBy,
    pan,
    render,
    fitToView,
    destroy,
    setOverlay,
    setFilter,
    setView,
    addImage,
    applyCrop,
    setLayerVisibility,
    moveLayer,
    moveLayerOffset,
    setLayerOffset,
    setLayerScale,
    setLayerRotation,
    setLayerOpacity,
    setLayerBlendMode,
    setLayerLocked,
    addEmptyLayer,
    getLayer,
    deleteLayer,
    duplicateLayer,
    renameLayer,
    get state() {
      return state
    }
  }
}

