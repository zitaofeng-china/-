/**
 * 属性面板组件
 * 显示当前选中工具的属性配置和编辑器状态信息，包括图层列表和时间线
 */
import React, { useState, useMemo, useEffect } from 'react'

import Slider from '../../components/ui/Slider'
import { CropTool } from '../../features/crop/CropTool'
import { DrawTool } from '../../features/draw/DrawTool'
import { FilterTool } from '../../features/filter/FilterTool'
import { TextTool } from '../../features/text/TextTool'
import { getDefaultTextConfig } from '../../features/text/text.service'
import { isLayerVisible } from '../../utils/layer-utils'
import { useRenderer } from '../../hooks/useRenderer'
import type {
  EditorTool,
  EditorSnapshot,
  TextLayerMetadata,
  Renderer,
  RendererRef
} from '../../types'
import type { UILayer } from '../../types/layer'
import type { TextLayer } from '../../types/tool'

type Props = {
  activeTool: EditorTool
  filterState: {
    brightness: number
    contrast: number
    saturation: number
    hue: number
    blur: number
    sharpen: number
    highlights: number
    shadows: number
    temperature: number
    exposure: number
    clarity: number
    fade: number
  }
  onFilterChange: (next: {
    brightness: number
    contrast: number
    saturation: number
    hue: number
    blur: number
    sharpen: number
    highlights: number
    shadows: number
    temperature: number
    exposure: number
    clarity: number
    fade: number
  }) => void
  onSelectTool: (tool: EditorTool) => void
  cropState?: { x: number; y: number; w: number; h: number; rotation: number } | null
  onCropChange?: (crop: { x: number; y: number; w: number; h: number; rotation: number } | null) => void
  cropGuidesVisible?: boolean
  onCropGuidesVisibleChange?: (visible: boolean) => void
  fileName: string | null
  timeline: { id: string; text: string; ts: number; snapshot?: EditorSnapshot }[]
  onTimeline: (text: string) => void
  onTimelineClick?: (entry: { id: string; text: string; ts: number; snapshot?: EditorSnapshot }) => void
  rendererRef?: RendererRef
  layers?: UILayer[]
  activeLayerId?: string | null
  onActiveLayerChange?: (id: string | null) => void
  onCropConfirm?: () => void
  onDrawConfig?: (color: string, size: number) => void
  onAddText?: (config: Omit<TextLayer, 'id' | 'x' | 'y'>) => void
  onLayerDelete?: (id: string) => void
  onLayerVisibilityToggle?: (id: string, visible: boolean) => void
  onLayerMove?: (id: string, direction: 'up' | 'down') => void
  onLayerDuplicate?: (id: string) => void
  onLayerRename?: (id: string, name: string) => void
  onLayerAlignCenter?: (id: string) => void
  onLayerScaleChange?: (id: string, scale: number) => void
  onLayerScaleChangeEnd?: (id: string, scale: number) => void
  onLayerRotationChange?: (id: string, rotation: number) => void
  onLayerRotationChangeEnd?: (id: string, rotation: number) => void
  onLayerOpacityChange?: (id: string, opacity: number) => void
  onLayerBlendModeChange?: (id: string, blendMode: GlobalCompositeOperation) => void
  onLayerLockedChange?: (id: string, locked: boolean) => void
  onAddLayer?: () => void
  textLayerMetadata?: TextLayerMetadata
  onTextLayerMetadataChange?: (metadata: TextLayerMetadata) => void
  onUpdateTextLayer?: (layerId: string, config: Omit<TextLayer, 'id' | 'x' | 'y'>) => Promise<string | void>
}

type TabKey = 'adjust' | 'filter' | 'layers' | 'history'

export function PropertyPanel({
  activeTool,
  filterState,
  onFilterChange,
  onSelectTool,
  cropState,
  onCropChange,
  cropGuidesVisible = true,
  onCropGuidesVisibleChange,
  fileName,
  timeline,
  onTimeline,
  onTimelineClick,
  rendererRef,
  layers = [],
  activeLayerId,
  onActiveLayerChange,
  onCropConfirm,
  onDrawConfig,
  onAddText,
  onLayerDelete,
  onLayerVisibilityToggle,
  onLayerMove,
  onLayerDuplicate,
  onLayerRename,
  onLayerAlignCenter,
  onLayerScaleChange,
  onLayerScaleChangeEnd,
  onLayerRotationChange,
  onLayerRotationChangeEnd,
  onLayerOpacityChange,
  onLayerBlendModeChange,
  onLayerLockedChange,
  onAddLayer,
  textLayerMetadata = {},
  onTextLayerMetadataChange,
  onUpdateTextLayer
}: Props) {
  // 当选择裁剪、画笔或文字工具时，自动切换到"调整"标签页
  const [activeTab, setActiveTab] = useState<TabKey>('adjust')
  
  useEffect(() => {
    if (activeTool === 'crop' || activeTool === 'draw' || activeTool === 'text') {
      setActiveTab('adjust')
    }
  }, [activeTool])
  
  const { getRenderer } = useRenderer(rendererRef)
  const currentRenderer = getRenderer()
  const activeLayer = activeLayerId && currentRenderer ? currentRenderer.getLayer(activeLayerId) : null
  const isTextLayer = activeLayer && activeLayer.name.startsWith('Text:')
  const activeTextMetadata = activeLayerId && isTextLayer ? textLayerMetadata[activeLayerId] : null

  // 滤镜预设配置（包含最新调整项，避免依赖默认值）
  const filterPresets = useMemo(() => {
    const base = (partial: Partial<typeof filterState>) => ({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      blur: 0,
      sharpen: 0,
      highlights: 100,
      shadows: 100,
      temperature: 0,
      exposure: 0,
      clarity: 0,
      fade: 0,
      ...partial
    })

    return [
      {
        id: 'original',
        name: '原始',
        config: base({}),
        thumbnail:
          'https://images.pexels.com/photos/2486168/pexels-photo-2486168.jpeg?auto=compress&cs=tinysrgb&w=200'
      },
      {
        id: 'vivid',
        name: '鲜艳',
        // 增强对比与饱和度，适度提亮和锐化
        config: base({
          brightness: 103,
          contrast: 118,
          saturation: 130,
          clarity: 12,
          highlights: 106
        }),
        thumbnail:
          'https://images.pexels.com/photos/462162/pexels-photo-462162.jpeg?auto=compress&cs=tinysrgb&w=200'
      },
      {
        id: 'warm',
        name: '温暖',
        // 偏暖、略微柔和的日落/室内氛围
        config: base({
          brightness: 106,
          contrast: 108,
          saturation: 112,
          hue: 10,
          temperature: 25,
          exposure: 3,
          highlights: 108,
          shadows: 102,
          clarity: 6
        }),
        thumbnail:
          'https://images.pexels.com/photos/573299/pexels-photo-573299.jpeg?auto=compress&cs=tinysrgb&w=200'
      },
      {
        id: 'cool',
        name: '冷色',
        // 偏冷、干净通透
        config: base({
          brightness: 100,
          contrast: 112,
          saturation: 102,
          hue: -12,
          temperature: -25,
          clarity: 10,
          highlights: 104,
          shadows: 96
        }),
        thumbnail:
          'https://images.pexels.com/photos/346529/pexels-photo-346529.jpeg?auto=compress&cs=tinysrgb&w=200'
      },
      {
        id: 'vintage',
        name: '复古',
        // 暗部略压、整体褪色偏黄棕
        config: base({
          brightness: 98,
          contrast: 90,
          saturation: 80,
          hue: 12,
          fade: 32,
          clarity: -6,
          highlights: 104,
          shadows: 96
        }),
        thumbnail:
          'https://images.pexels.com/photos/712618/pexels-photo-712618.jpeg?auto=compress&cs=tinysrgb&w=200'
      },
      {
        id: 'bw',
        name: '黑白',
        // 纯黑白，高对比、黑位扎实，去掉褪色
        config: base({
          brightness: 98,
          contrast: 132,
          saturation: 0,
          hue: 0,
          clarity: 10,
          fade: 0,
          highlights: 110,
          shadows: 88
        }),
        thumbnail:
          'https://images.pexels.com/photos/3407729/pexels-photo-3407729.jpeg?auto=compress&cs=tinysrgb&w=200'
      },
      {
        id: 'dramatic',
        name: '戏剧',
        // 暗部更重、高对比、高清晰度，适合大片戏剧感
        config: base({
          brightness: 92,
          contrast: 136,
          saturation: 120,
          hue: 0,
          clarity: 18,
          exposure: -4,
          fade: 3,
          highlights: 112,
          shadows: 90
        }),
        thumbnail:
          'https://images.pexels.com/photos/1552103/pexels-photo-1552103.jpeg?auto=compress&cs=tinysrgb&w=200'
      },
      {
        id: 'fade',
        name: '褪色',
        // 明显的褪色和对比下降，整体略亮偏灰
        config: base({
          brightness: 106,
          contrast: 82,
          saturation: 78,
          fade: 40,
          clarity: -4,
          highlights: 108,
          shadows: 104
        }),
        thumbnail:
          'https://images.pexels.com/photos/460621/pexels-photo-460621.jpeg?auto=compress&cs=tinysrgb&w=200'
      },
      {
        id: 'portrait',
        name: '人像柔肤',
        // 适合人像，提亮高光、降低清晰度并略加虚化
        config: base({
          brightness: 108,
          contrast: 92,
          saturation: 108,
          blur: 1.2,
          clarity: -10,
          highlights: 110,
          shadows: 104,
          fade: 6
        }),
        thumbnail:
          'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200'
      },
      {
        id: 'sunset',
        name: '日落',
        // 偏暖、高饱和的夕阳色调
        config: base({
          brightness: 104,
          contrast: 112,
          saturation: 138,
          hue: 12,
          temperature: 22,
          clarity: 8,
          highlights: 110
        }),
        thumbnail:
          'https://images.pexels.com/photos/799443/pexels-photo-799443.jpeg?auto=compress&cs=tinysrgb&w=200'
      },
      {
        id: 'night',
        name: '夜景',
        // 压暗整体、提升对比和清晰度，适合城市夜景
        config: base({
          brightness: 84,
          contrast: 130,
          saturation: 118,
          hue: -5,
          clarity: 14,
          exposure: -12,
          fade: 2,
          highlights: 106,
          shadows: 92
        }),
        thumbnail:
          'https://images.pexels.com/photos/316933/pexels-photo-316933.jpeg?auto=compress&cs=tinysrgb&w=200'
      },
      {
        id: 'film',
        name: '胶片',
        // 轻微褪色、偏暖的胶片感
        config: base({
          brightness: 100,
          contrast: 108,
          saturation: 92,
          hue: 5,
          fade: 22,
          clarity: -4,
          highlights: 106,
          shadows: 98
        }),
        thumbnail:
          'https://images.pexels.com/photos/1036936/pexels-photo-1036936.jpeg?auto=compress&cs=tinysrgb&w=200'
      },
      {
        id: 'softLight',
        name: '柔光',
        // 整体柔和、略亮，适度虚化
        config: base({
          brightness: 106,
          contrast: 94,
          saturation: 104,
          hue: 4,
          blur: 0.6,
          fade: 12,
          clarity: -4,
          highlights: 108,
          shadows: 102
        }),
        thumbnail:
          'https://images.pexels.com/photos/462680/pexels-photo-462680.jpeg?auto=compress&cs=tinysrgb&w=200'
      },
      {
        id: 'highKey',
        name: '高亮',
        // 高亮、低对比的高调画面，适度保留细节
        config: base({
          brightness: 116,
          contrast: 104,
          saturation: 110,
          exposure: 8,
          highlights: 116,
          shadows: 108,
          clarity: 4,
          fade: 8
        }),
        thumbnail:
          'https://images.pexels.com/photos/37347/office-freelance-computer-business-37347.jpeg?auto=compress&cs=tinysrgb&w=200'
      },
      {
        id: 'lowSaturation',
        name: '低饱和',
        // 降低饱和度但保持一定对比
        config: base({
          brightness: 100,
          contrast: 104,
          saturation: 55,
          fade: 10,
          clarity: 4,
          highlights: 104
        }),
        thumbnail:
          'https://images.pexels.com/photos/373893/pexels-photo-373893.jpeg?auto=compress&cs=tinysrgb&w=200'
      },
      {
        id: 'tealOrange',
        name: '电影蓝橙',
        // 常见电影蓝橙分离色调：阴影偏蓝、高光偏暖
        config: base({
          brightness: 102,
          contrast: 120,
          saturation: 120,
          hue: 18,
          temperature: 8,
          clarity: 14,
          highlights: 108,
          shadows: 96
        }),
        thumbnail:
          'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=200'
      },
      {
        id: 'warmBrown',
        name: '复古棕',
        // 偏棕的复古暖调，适度褪色
        config: base({
          brightness: 100,
          contrast: 108,
          saturation: 88,
          hue: 18,
          temperature: 18,
          fade: 20,
          clarity: -4,
          highlights: 108,
          shadows: 96
        }),
        thumbnail:
          'https://images.pexels.com/photos/4827/nature-forest-trees-fog.jpeg?auto=compress&cs=tinysrgb&w=200'
      },
      {
        id: 'sharpen',
        name: '清晰锐化',
        // 明显提升细节和对比的锐化效果
        config: base({
          brightness: 100,
          contrast: 118,
          saturation: 110,
          hue: 0,
          sharpen: 25,
          clarity: 20,
          highlights: 104,
          shadows: 98
        }),
        thumbnail:
          'https://images.pexels.com/photos/36487/rock-formation-erosion-red-usa.jpg?auto=compress&cs=tinysrgb&w=200'
      }
    ]
  }, [filterState])

  // 生成滤镜预览缩略图（使用 useMemo 缓存）
  const filterPreviews = useMemo(() => {
    const previews: Record<string, string> = {}
    
    filterPresets.forEach((filter) => {
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // 先绘制到临时画布
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = 100
      tempCanvas.height = 100
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) return

      // 绘制预览图案（天空、太阳、地面）
      tempCtx.fillStyle = '#4a90e2'
      tempCtx.fillRect(0, 0, 100, 100)
      
      // 太阳
      tempCtx.fillStyle = '#f5a623'
      tempCtx.beginPath()
      tempCtx.arc(50, 30, 15, 0, Math.PI * 2)
      tempCtx.fill()
      
      // 地面
      tempCtx.fillStyle = '#7ed321'
      tempCtx.beginPath()
      tempCtx.moveTo(20, 70)
      tempCtx.lineTo(50, 50)
      tempCtx.lineTo(80, 70)
      tempCtx.lineTo(80, 100)
      tempCtx.lineTo(20, 100)
      tempCtx.closePath()
      tempCtx.fill()

      // 应用滤镜效果到主画布（与渲染逻辑一致，包含新增属性）
      const {
        brightness = 100,
        contrast = 100,
        saturation = 100,
        hue = 0,
        blur = 0,
        sharpen = 0,
        highlights = 100,
        shadows = 100,
        temperature = 0,
        exposure = 0,
        clarity = 0,
        fade = 0
      } = filter.config as typeof filterState

      const filters: string[] = []

      // 褪色与清晰度增益
      const clarityContrastBoost = clarity * 0.3
      const claritySaturationBoost = clarity * 0.1
      const fadeStrength = Math.max(0, Math.min(100, fade))
      const fadeBrightnessBoost = fadeStrength * 0.2
      const fadeContrastDrop = fadeStrength * 0.6
      const fadeSaturationDrop = fadeStrength * 0.2

      // 亮度相关（高光/阴影/曝光/褪色，高光/阴影为负值时整体变暗，为正值时整体变亮）
      const hlOffset = (highlights - 100) * 0.3
      const shOffset = (shadows - 100) * 0.2
      const expOffset = exposure * 0.8
      const effectiveBrightness = brightness + hlOffset + shOffset + expOffset + fadeBrightnessBoost
      if (effectiveBrightness !== 100) filters.push(`brightness(${effectiveBrightness}%)`)

      // 色温
      if (temperature !== 0) {
        const t = Math.max(-100, Math.min(100, temperature))
        const tone = Math.abs(t)
        const sepiaPct = t > 0 ? tone * 0.6 : tone * 0.25
        const saturatePct = 100 + t * 0.3
        const hueShift = t * -0.4
        if (sepiaPct !== 0) filters.push(`sepia(${sepiaPct}%)`)
        if (saturatePct !== 100) filters.push(`saturate(${saturatePct}%)`)
        if (hueShift !== 0) filters.push(`hue-rotate(${hueShift}deg)`)
      }

      // 对比度 / 饱和度 / 色相 / 模糊 / 锐化
      const contrastBase = contrast + clarityContrastBoost - fadeContrastDrop
      const effectiveContrast = sharpen > 0 
        ? contrastBase + (sharpen / 100) * 20 
        : contrastBase
      if (effectiveContrast !== 100) filters.push(`contrast(${effectiveContrast}%)`)

      const effectiveSaturation = saturation + claritySaturationBoost - fadeSaturationDrop
      if (effectiveSaturation !== 100) filters.push(`saturate(${effectiveSaturation}%)`)
      if (hue !== 0) filters.push(`hue-rotate(${hue}deg)`)
      if (blur > 0) filters.push(`blur(${blur}px)`)
      
      if (filters.length > 0) {
        ctx.filter = filters.join(' ')
      }
      
      // 将临时画布绘制到主画布（应用滤镜）
      ctx.drawImage(tempCanvas, 0, 0)
      ctx.filter = 'none'

      previews[filter.id] = canvas.toDataURL()
    })

    return previews
  }, [filterPresets])

  // 调整面板内容
  const renderAdjustPanel = () => {
    // 如果选择了裁剪工具，显示裁剪属性
    if (activeTool === 'crop') {
      const renderer = getRenderer()
      const imgSize = renderer?.state.imgSize || { w: 0, h: 0 }
      const imageSize = { width: imgSize.w, height: imgSize.h }
      
      return (
        <div className="property-panel-content">
          <CropTool
            onConfirm={onCropConfirm}
            onCancel={() => onSelectTool(null)}
            crop={cropState ?? (rendererRef?.current?.getCrop?.() || null)}
            onCropChange={(newCrop) => {
              rendererRef?.current?.setCrop?.(newCrop)
              onCropChange?.(newCrop)
            }}
            imageSize={imageSize}
            guidesVisible={cropGuidesVisible}
            onGuidesVisibleChange={onCropGuidesVisibleChange}
          />
        </div>
      )
    }

    // 如果选择了画笔工具，显示画笔属性
    if (activeTool === 'draw') {
      return (
        <div className="property-panel-content">
          <DrawTool
            onDrawStart={onDrawConfig}
            onDrawEnd={() => {}}
          />
        </div>
      )
    }

    // 如果选择了文字工具或当前选中文本图层，显示文字属性
    if (activeTool === 'text' || isTextLayer) {
      const fallbackTextConfig = activeTextMetadata || (isTextLayer
        ? {
            ...getDefaultTextConfig(),
            text: (activeLayer?.name?.replace(/^Text:\s*/, '') || getDefaultTextConfig().text)
          }
        : undefined)

      return (
        <div className="property-panel-content">
          <TextTool
            onAddText={onAddText}
            onChange={isTextLayer && activeLayerId ? (config) => {
              onUpdateTextLayer?.(activeLayerId, config)
            } : undefined}
            initialConfig={fallbackTextConfig}
            isEditMode={!!(isTextLayer && activeLayerId)}
          />
        </div>
      )
    }

    // 默认显示图像调整属性
    const adjustState = {
      brightness: filterState.brightness - 100,
      contrast: filterState.contrast - 100,
      saturation: filterState.saturation - 100,
      hue: filterState.hue,
      blur: filterState.blur,
      sharpen: filterState.sharpen,
      highlights: filterState.highlights - 100,
      shadows: filterState.shadows - 100,
      temperature: filterState.temperature,
      exposure: filterState.exposure,
      clarity: filterState.clarity,
      fade: filterState.fade
    }

    const updateAdjust = (key: string, value: number) => {
      if (key === 'brightness') {
        onFilterChange({ ...filterState, brightness: value + 100 })
      } else if (key === 'contrast') {
        onFilterChange({ ...filterState, contrast: value + 100 })
      } else if (key === 'saturation') {
        onFilterChange({ ...filterState, saturation: value + 100 })
      } else if (key === 'hue') {
        // 色调范围：-180 到 180，滑块显示：0 到 360
        onFilterChange({ ...filterState, hue: value - 180 })
      } else if (key === 'blur') {
        onFilterChange({ ...filterState, blur: value })
      } else if (key === 'sharpen') {
        onFilterChange({ ...filterState, sharpen: value })
      } else if (key === 'highlights') {
        onFilterChange({ ...filterState, highlights: value + 100 })
      } else if (key === 'shadows') {
        onFilterChange({ ...filterState, shadows: value + 100 })
      } else if (key === 'temperature') {
        onFilterChange({ ...filterState, temperature: value })
      } else if (key === 'exposure') {
        onFilterChange({ ...filterState, exposure: value })
      } else if (key === 'clarity') {
        onFilterChange({ ...filterState, clarity: value })
      } else if (key === 'fade') {
        onFilterChange({ ...filterState, fade: value })
      }
    }

  return (
      <div className="property-panel-content">
        <h3 className="property-panel-title">调整</h3>
        <div className="property-controls">
          <div className="property-control-item">
            <div className="property-control-label">
              <span>亮度</span>
              <span className="property-control-value">{adjustState.brightness}</span>
            </div>
            <Slider
              value={adjustState.brightness + 100}
              min={0}
              max={200}
              onChange={(v) => updateAdjust('brightness', v - 100)}
            />
          </div>
          <div className="property-control-item">
            <div className="property-control-label">
              <span>高光</span>
              <span className="property-control-value">{adjustState.highlights}</span>
            </div>
            <Slider
              value={adjustState.highlights + 100}
              min={0}
              max={200}
              onChange={(v) => updateAdjust('highlights', v - 100)}
            />
          </div>
          <div className="property-control-item">
            <div className="property-control-label">
              <span>阴影</span>
              <span className="property-control-value">{adjustState.shadows}</span>
            </div>
            <Slider
              value={adjustState.shadows + 100}
              min={0}
              max={200}
              onChange={(v) => updateAdjust('shadows', v - 100)}
            />
          </div>
          <div className="property-control-item">
            <div className="property-control-label">
              <span>色温</span>
              <span className="property-control-value">{adjustState.temperature}</span>
            </div>
            <Slider
              value={adjustState.temperature}
              min={-100}
              max={100}
              onChange={(v) => updateAdjust('temperature', v)}
            />
          </div>
          <div className="property-control-item">
            <div className="property-control-label">
              <span>曝光</span>
              <span className="property-control-value">{adjustState.exposure}</span>
            </div>
            <Slider
              value={adjustState.exposure}
              min={-100}
              max={100}
              onChange={(v) => updateAdjust('exposure', v)}
            />
          </div>
          <div className="property-control-item">
            <div className="property-control-label">
              <span>清晰度</span>
              <span className="property-control-value">{adjustState.clarity}</span>
            </div>
            <Slider
              value={adjustState.clarity}
              min={-100}
              max={100}
              onChange={(v) => updateAdjust('clarity', v)}
            />
          </div>
          <div className="property-control-item">
            <div className="property-control-label">
              <span>对比度</span>
              <span className="property-control-value">{adjustState.contrast}</span>
            </div>
            <Slider
              value={adjustState.contrast + 100}
              min={0}
              max={200}
              onChange={(v) => updateAdjust('contrast', v - 100)}
            />
          </div>
          <div className="property-control-item">
            <div className="property-control-label">
              <span>饱和度</span>
              <span className="property-control-value">{adjustState.saturation}</span>
            </div>
            <Slider
              value={adjustState.saturation + 100}
              min={0}
              max={200}
              onChange={(v) => updateAdjust('saturation', v - 100)}
            />
          </div>
          <div className="property-control-item">
            <div className="property-control-label">
              <span>色调</span>
              <span className="property-control-value">{adjustState.hue}</span>
            </div>
            <Slider
              value={adjustState.hue + 180}
              min={0}
              max={360}
              onChange={(v) => updateAdjust('hue', v)}
            />
          </div>
          <div className="property-control-item">
            <div className="property-control-label">
              <span>模糊</span>
              <span className="property-control-value">{adjustState.blur}</span>
            </div>
            <Slider
              value={adjustState.blur}
              min={0}
              max={100}
              onChange={(v) => updateAdjust('blur', v)}
            />
          </div>
          <div className="property-control-item">
            <div className="property-control-label">
              <span>锐化</span>
              <span className="property-control-value">{adjustState.sharpen}</span>
            </div>
            <Slider
              value={adjustState.sharpen}
              min={0}
              max={100}
              onChange={(v) => updateAdjust('sharpen', v)}
            />
          </div>
          <div className="property-control-item">
            <div className="property-control-label">
              <span>褪色</span>
              <span className="property-control-value">{adjustState.fade}</span>
            </div>
            <Slider
              value={adjustState.fade}
              min={0}
              max={100}
              onChange={(v) => updateAdjust('fade', v)}
            />
          </div>
        </div>
        <div className="property-actions">
          <button
            className="property-button"
            onClick={() =>
              onFilterChange({
                brightness: 100,
                contrast: 100,
                saturation: 100,
                hue: 0,
                blur: 0,
                sharpen: 0,
                highlights: 100,
                  shadows: 100,
                  temperature: 0,
                  exposure: 0,
                  clarity: 0,
                  fade: 0
              })
            }
          >
            重置
          </button>
        </div>
      </div>
    )
  }

  // 滤镜面板内容
  const renderFilterPanel = () => {

    return (
      <div className="property-panel-content">
        <h3 className="property-panel-title">滤镜</h3>
        <div className="filter-grid">
          {filterPresets.map((filter) => {
          const thumbUrl = (filter as any).thumbnail as string | undefined
          const fallbackUrl = filterPreviews[filter.id]
          const previewUrl = thumbUrl || fallbackUrl
            return (
              <button
                key={filter.id}
                className="filter-item"
                onClick={() => {
                  onFilterChange({
                    ...filterState,
                    brightness: filter.config.brightness,
                    contrast: filter.config.contrast,
                    saturation: filter.config.saturation,
                    hue: filter.config.hue,
                    blur: filter.config.blur,
                    sharpen: filter.config.sharpen,
                    highlights: filter.config.highlights,
                    shadows: filter.config.shadows,
                    temperature: filter.config.temperature,
                    exposure: filter.config.exposure,
                    clarity: filter.config.clarity,
                    fade: filter.config.fade
                  })
                  onTimeline(`应用滤镜: ${filter.name}`)
                }}
              >
                <div className="filter-preview">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={filter.name}
                      className="filter-preview-image"
                      loading="lazy"
                      onError={(e) => {
                        if (fallbackUrl && e.currentTarget.src !== fallbackUrl) {
                          e.currentTarget.src = fallbackUrl
                        } else {
                          // 无法加载外部资源和本地预览时，隐藏图片，保留占位 SVG
                          e.currentTarget.style.display = 'none'
                        }
                      }}
                    />
                  ) : (
                    <svg viewBox="0 0 100 100" className="filter-icon">
                      <rect width="100" height="100" fill="#4a90e2" />
                      <circle cx="50" cy="30" r="15" fill="#f5a623" />
                      <path d="M20 70 L50 50 L80 70 L80 100 L20 100 Z" fill="#7ed321" />
                    </svg>
                  )}
                </div>
                <span className="filter-name">{filter.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 图层面板内容
  const renderLayersPanel = () => {
    // 使用 rendererRef 获取最新的 renderer，确保能获取到隐藏的图层
    const currentRenderer = getRenderer()
    const activeLayerOpacity = activeLayer ? Math.round(activeLayer.opacity * 100) : 100
    const activeLayerBlendMode = activeLayer?.blendMode || 'source-over'
    const activeLayerLocked = activeLayer?.locked || false
    
    return (
      <div className="property-panel-content">
        <div className="property-panel-header">
          <h3 className="property-panel-title">图层</h3>
          <button 
            className="property-icon-button" 
            title="添加图层"
            onClick={(e) => {
              e.stopPropagation()
              onAddLayer?.()
            }}
          >
            +
          </button>
        </div>
        <div className="layers-list">
          {layers.length === 0 && (
            <div className="layers-empty">暂无图层</div>
          )}
          {layers.slice().reverse().map((l) => {
            // 移除未使用的 idx 变量
            const isVisible = isLayerVisible(l.visible)
            const isActive = l.id === activeLayerId
            const layer = currentRenderer?.getLayer(l.id)
            const isLocked = layer?.locked || false
            
            return (
              <div
                key={l.id}
                className={`layer-item ${isActive ? 'active' : ''} ${!isVisible ? 'layer-hidden' : ''} ${isLocked ? 'locked' : ''}`}
                onClick={() => {
                  // 即使锁定也可以选中，只是不能移动等操作
                  onActiveLayerChange?.(l.id)
                }}
              >
                <div className="layer-header">
                  <button
                    className="layer-visibility-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onLayerVisibilityToggle?.(l.id, !isVisible)
                    }}
                    title={isVisible ? '隐藏图层' : '显示图层'}
                  >
                    {isVisible ? '👁' : '👁‍🗨'}
                  </button>
            <button
              className="layer-visibility-button"
              onClick={(e) => {
                e.stopPropagation()
                const newName = prompt('重命名图层', l.name)
                if (newName !== null) {
                  onLayerRename?.(l.id, newName)
                }
              }}
              title="重命名图层"
            >
              ✏️
            </button>
                  <div className="layer-info">
                    <div className="layer-name">{l.name}</div>
                    <div className="layer-size">{l.w} × {l.h}</div>
                  </div>
                  <button
                    className={`layer-lock-button ${isLocked ? 'locked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onLayerLockedChange?.(l.id, !isLocked)
                    }}
                    title={isLocked ? '解锁' : '锁定'}
                  >
                    {isLocked ? '🔒' : '🔓'}
                  </button>
                </div>
                {isActive && layer && (
                  <div className="layer-properties">
                    <div className="layer-property actions-row">
                      <button
                        className="layer-action-button"
                        disabled={isLocked}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!isLocked) onLayerAlignCenter?.(l.id)
                        }}
                        title={isLocked ? '锁定图层无法居中' : '居中到画布'}
                      >
                        居中
                      </button>
                      <button
                        className="layer-action-button"
                        disabled={isLocked}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!isLocked) onLayerMove?.(l.id, 'up')
                        }}
                        title={isLocked ? '锁定图层无法上移' : '上移一层'}
                      >
                        上移
                      </button>
                      <button
                        className="layer-action-button"
                        disabled={isLocked}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!isLocked) onLayerMove?.(l.id, 'down')
                        }}
                        title={isLocked ? '锁定图层无法下移' : '下移一层'}
                      >
                        下移
                      </button>
                    </div>
                    <div className="layer-property">
                      <span>不透明度:</span>
                      <div className="layer-property-control">
                        <Slider
                          value={Math.round(layer.opacity * 100)}
                          min={0}
                          max={100}
                          disabled={isLocked}
                          onChange={(v) => {
                            if (!isLocked) {
                              onLayerOpacityChange?.(l.id, v / 100)
                            }
                          }}
                        />
                        <span className="layer-property-value">{Math.round(layer.opacity * 100)}%</span>
                      </div>
                    </div>
                    <div className="layer-property">
                      <span>混合模式:</span>
                      <select 
                        className="layer-blend-mode" 
                        value={layer.blendMode || 'source-over'}
                        disabled={isLocked}
                        onChange={(e) => {
                          if (!isLocked) {
                            onLayerBlendModeChange?.(l.id, e.target.value as GlobalCompositeOperation)
                          }
                        }}
                      >
                        <option value="source-over">正常</option>
                        <option value="multiply">正片叠底</option>
                        <option value="screen">滤色</option>
                        <option value="overlay">叠加</option>
                        <option value="soft-light">柔光</option>
                        <option value="hard-light">强光</option>
                        <option value="color-dodge">颜色减淡</option>
                        <option value="color-burn">颜色加深</option>
                        <option value="darken">变暗</option>
                        <option value="lighten">变亮</option>
                        <option value="difference">差值</option>
                        <option value="exclusion">排除</option>
                      </select>
                    </div>
                  </div>
                )}
                <div className="layer-actions">
                  <button
                    className="layer-action-button" 
                    disabled={isLocked}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isLocked) {
                      onLayerDuplicate?.(l.id)
                      }
                    }}
                    title={isLocked ? "锁定图层无法复制" : "复制"}
                  >
                    📋
                  </button>
                  <button
                    className="layer-action-button" 
                    disabled={isLocked}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isLocked) {
                        onLayerDelete?.(l.id)
                      }
                    }}
                    title={isLocked ? "锁定图层无法删除" : "删除"}
                  >
                    🗑
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // 历史面板内容
  const renderHistoryPanel = () => {
    return (
      <div className="property-panel-content">
        <h3 className="property-panel-title">历史</h3>
        <div className="history-list">
          {timeline.length === 0 && (
            <div className="history-empty">暂无历史记录</div>
          )}
          {timeline.slice().reverse().map((item) => (
            <div
              key={item.id}
              className={`history-item ${item.snapshot ? 'restorable' : ''}`}
              onClick={() => {
                if (item.snapshot && onTimelineClick) {
                  onTimelineClick(item)
                }
              }}
            >
              <div className="history-text">{item.text}</div>
              <div className="history-time">{new Date(item.ts).toLocaleTimeString()}</div>
              </div>
            ))}
        </div>
      </div>
    )
  }

  // 根据工具类型渲染不同的内容
  const renderToolContent = () => {
    // 裁剪、画笔、文字工具或未选择工具时，都显示标签页
    // 滤镜工具直接显示滤镜面板（不显示标签页）
    if (activeTool === 'filter') {
      return (
        <div className="property-panel-body">
          {renderFilterPanel()}
        </div>
      )
    }

    // 其他情况显示标签页
    return (
      <>
        {/* 标签页 */}
        <div className="property-tabs">
          <button
            className={`property-tab ${activeTab === 'adjust' ? 'active' : ''}`}
            onClick={() => setActiveTab('adjust')}
          >
            调整
          </button>
          <button
            className={`property-tab ${activeTab === 'filter' ? 'active' : ''}`}
            onClick={() => setActiveTab('filter')}
          >
            滤镜
          </button>
          <button
            className={`property-tab ${activeTab === 'layers' ? 'active' : ''}`}
            onClick={() => setActiveTab('layers')}
          >
            图层
          </button>
          <button
            className={`property-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            历史
          </button>
        </div>

        {/* 面板内容 */}
        <div className="property-panel-body">
          {activeTab === 'adjust' && renderAdjustPanel()}
          {activeTab === 'filter' && renderFilterPanel()}
          {activeTab === 'layers' && renderLayersPanel()}
          {activeTab === 'history' && renderHistoryPanel()}
        </div>
      </>
    )
  }

  return (
    <div className="property-panel">
      {renderToolContent()}
    </div>
  )
}
