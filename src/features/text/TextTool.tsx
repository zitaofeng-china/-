/**
 * 文本工具组件
 * 提供在图像上添加和编辑文本功能的用户界面
 */
import React, { useState, useCallback, useEffect } from 'react'
import { Button } from '../../components/ui/Button'
import Slider from '../../components/ui/Slider'
import { getDefaultTextConfig } from './text.service'
import type { TextLayer } from '../../types/tool'

type Props = {
  onAddText?: (config: Omit<TextLayer, 'id' | 'x' | 'y'>) => void
  onChange?: (config: Omit<TextLayer, 'id' | 'x' | 'y'>) => void // 实时更新回调
  initialConfig?: Omit<TextLayer, 'id' | 'x' | 'y'>
  isEditMode?: boolean
}

export function TextTool({ onAddText, onChange, initialConfig, isEditMode = false }: Props) {
  const defaultConfig = initialConfig || getDefaultTextConfig()
  const [text, setText] = useState(defaultConfig.text)
  const [fontSize, setFontSize] = useState(defaultConfig.fontSize)
  const [color, setColor] = useState(defaultConfig.color)
  const [align, setAlign] = useState<'left' | 'center' | 'right'>(defaultConfig.align)
  const [bold, setBold] = useState(defaultConfig.bold)
  const [italic, setItalic] = useState(defaultConfig.italic)
  const [fontFamily, setFontFamily] = useState(defaultConfig.fontFamily)
  const [lineHeight, setLineHeight] = useState(defaultConfig.lineHeight ?? 1.2)
  const [opacity, setOpacity] = useState(Math.round((defaultConfig.opacity ?? 1) * 100))
  const [strokeColor, setStrokeColor] = useState(defaultConfig.strokeColor ?? '#000000')
  const [strokeWidth, setStrokeWidth] = useState(defaultConfig.strokeWidth ?? 0)
  const [shadowColor, setShadowColor] = useState(defaultConfig.shadowColor ?? 'rgba(0,0,0,0.2)')
  const [shadowBlur, setShadowBlur] = useState(defaultConfig.shadowBlur ?? 0)
  const [shadowOffsetX, setShadowOffsetX] = useState(defaultConfig.shadowOffsetX ?? 0)
  const [shadowOffsetY, setShadowOffsetY] = useState(defaultConfig.shadowOffsetY ?? 0)
  const [underline, setUnderline] = useState(defaultConfig.underline ?? false)
  const [strike, setStrike] = useState(defaultConfig.strike ?? false)
  const [backgroundColor, setBackgroundColor] = useState(defaultConfig.backgroundColor ?? 'transparent')
  const [backgroundPadding, setBackgroundPadding] = useState(defaultConfig.backgroundPadding ?? 20)
  const [backgroundRadius, setBackgroundRadius] = useState(defaultConfig.backgroundRadius ?? 8)
  const [letterSpacing, setLetterSpacing] = useState(defaultConfig.letterSpacing ?? 0)
  const [textTransform, setTextTransform] = useState(defaultConfig.textTransform ?? 'none')

  // 当initialConfig变化时更新状态
  useEffect(() => {
    if (initialConfig) {
      setText(initialConfig.text)
      setFontSize(initialConfig.fontSize)
      setColor(initialConfig.color)
      setAlign(initialConfig.align)
      setBold(initialConfig.bold)
      setItalic(initialConfig.italic)
      setFontFamily(initialConfig.fontFamily)
      setLineHeight(initialConfig.lineHeight ?? 1.2)
      setOpacity(Math.round((initialConfig.opacity ?? 1) * 100))
      setStrokeColor(initialConfig.strokeColor ?? '#000000')
      setStrokeWidth(initialConfig.strokeWidth ?? 0)
      setShadowColor(initialConfig.shadowColor ?? '#000000')
      setShadowBlur(initialConfig.shadowBlur ?? 0)
      setShadowOffsetX(initialConfig.shadowOffsetX ?? 0)
      setShadowOffsetY(initialConfig.shadowOffsetY ?? 0)
      setUnderline(initialConfig.underline ?? false)
      setStrike(initialConfig.strike ?? false)
      setBackgroundColor(initialConfig.backgroundColor ?? 'transparent')
      setBackgroundPadding(initialConfig.backgroundPadding ?? 20)
      setBackgroundRadius(initialConfig.backgroundRadius ?? 8)
      setLetterSpacing(initialConfig.letterSpacing ?? 0)
      setTextTransform(initialConfig.textTransform ?? 'none')
    }
  }, [initialConfig])

  // 生成当前配置
  const getCurrentConfig = useCallback((): Omit<TextLayer, 'id' | 'x' | 'y'> => {
    return {
      text: text.trim() || ' ', // 空文本时使用空格，避免图层消失
      fontSize,
      fontFamily,
      color,
      align,
      bold,
      italic,
      lineHeight,
      opacity: (opacity || 0) / 100,
      strokeColor,
      strokeWidth,
      shadowColor,
      shadowBlur,
      shadowOffsetX,
      shadowOffsetY,
      underline,
      strike,
      backgroundColor,
      backgroundPadding,
      backgroundRadius,
      letterSpacing,
      textTransform
    }
  }, [text, fontSize, fontFamily, color, align, bold, italic, lineHeight, opacity, strokeColor, strokeWidth, shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY, underline, strike, backgroundColor, backgroundPadding, backgroundRadius, letterSpacing, textTransform])

  const emitChange = useCallback(
    (next?: Partial<Omit<TextLayer, 'id' | 'x' | 'y'>>) => {
      if (!isEditMode || !onChange) return
      const current = getCurrentConfig()
      onChange({ ...current, ...next })
    },
    [getCurrentConfig, isEditMode, onChange]
  )

  const handleAdd = () => {
    if (!text.trim()) return

    onAddText?.(getCurrentConfig())

    // 如果不是编辑模式，重置为默认值
    if (!isEditMode) {
      const defaultConfig = getDefaultTextConfig()
      setText(defaultConfig.text)
      setFontSize(defaultConfig.fontSize)
      setColor(defaultConfig.color)
      setAlign(defaultConfig.align)
      setBold(defaultConfig.bold)
      setItalic(defaultConfig.italic)
      setFontFamily(defaultConfig.fontFamily)
      setLineHeight(defaultConfig.lineHeight)
      setOpacity(Math.round((defaultConfig.opacity ?? 1) * 100))
      setStrokeColor(defaultConfig.strokeColor)
      setStrokeWidth(defaultConfig.strokeWidth)
      setShadowColor(defaultConfig.shadowColor)
      setShadowBlur(defaultConfig.shadowBlur)
      setShadowOffsetX(defaultConfig.shadowOffsetX)
      setShadowOffsetY(defaultConfig.shadowOffsetY)
      setUnderline(defaultConfig.underline ?? false)
      setStrike(defaultConfig.strike ?? false)
      setBackgroundColor(defaultConfig.backgroundColor ?? 'transparent')
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 text-sm text-slate-700">
      <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500 border border-slate-200">
        <p>· 当前选中文本图层的内容和样式会实时更新</p>
        <p>· 若需新增文本，请点击「添加文本」按钮</p>
      </div>

      <div>
        <label className="mb-1 block font-medium text-slate-100">文本内容</label>
        <textarea
          value={text}
          onChange={(e) => {
            const value = e.target.value
            setText(value)
            emitChange({ text: value.trim() || ' ' })
          }}
          className="w-full rounded-lg border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          rows={3}
          placeholder="输入文本..."
        />
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium text-slate-100">字体大小</span>
              <span className="text-xs text-slate-400">{fontSize}px</span>
            </div>
            <Slider
              value={fontSize}
              min={12}
              max={72}
              onChange={(v) => {
                setFontSize(v)
                emitChange({ fontSize: v })
              }}
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-100">字体</label>
            <select
              className="w-full rounded-lg border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={fontFamily}
              onChange={(e) => {
                setFontFamily(e.target.value)
                emitChange({ fontFamily: e.target.value })
              }}
            >
              <option value="system-ui, -apple-system, sans-serif">系统默认</option>
              <option value="'PingFang SC', 'Microsoft YaHei', sans-serif">雅黑 / 苹方</option>
              <option value="'Noto Sans SC', sans-serif">思源黑体</option>
              <option value="'Source Han Serif SC', serif">思源宋体</option>
              <option value="'Hiragino Sans GB', 'Microsoft YaHei', sans-serif">冬青黑</option>
              <option value="'Roboto', 'Helvetica Neue', Arial, sans-serif">Roboto</option>
              <option value="'Inter', 'Helvetica Neue', Arial, sans-serif">Inter</option>
              <option value="'Open Sans', 'Helvetica Neue', Arial, sans-serif">Open Sans</option>
              <option value="serif">通用衬线 Serif</option>
              <option value="monospace">等宽 Monospace</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium text-slate-100">行高</span>
              <span className="text-xs text-slate-400">{lineHeight.toFixed(2)}</span>
            </div>
            <Slider
              value={lineHeight}
              min={0.8}
              max={3}
              step={0.05}
              onChange={(v) => {
                setLineHeight(v)
                emitChange({ lineHeight: v })
              }}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium text-slate-100">不透明度</span>
              <span className="text-xs text-slate-400">{opacity}%</span>
            </div>
            <Slider
              value={opacity}
              min={0}
              max={100}
              onChange={(v) => {
                setOpacity(v)
                emitChange({ opacity: v / 100 })
              }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium text-slate-100">字间距</span>
              <span className="text-xs text-slate-400">{letterSpacing.toFixed(1)}px</span>
            </div>
            <Slider
              value={letterSpacing}
              min={-5}
              max={20}
              step={0.5}
              onChange={(v) => {
                setLetterSpacing(v)
                emitChange({ letterSpacing: v })
              }}
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-100">文本变换</label>
            <select
              className="w-full rounded-lg border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={textTransform}
              onChange={(e) => {
                const val = e.target.value as typeof textTransform
                setTextTransform(val)
                emitChange({ textTransform: val })
              }}
            >
              <option value="none">不变</option>
              <option value="uppercase">全大写</option>
              <option value="lowercase">全小写</option>
              <option value="capitalize">首字母大写</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block font-medium text-slate-100">填充颜色</label>
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value)
                emitChange({ color: e.target.value })
              }}
              className="h-10 w-full cursor-pointer rounded border border-slate-600 bg-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-100">背景颜色</label>
            <input
              type="color"
              value={backgroundColor === 'transparent' ? '#000000' : backgroundColor}
              onChange={(e) => {
                const val = e.target.value
                setBackgroundColor(val)
                emitChange({ backgroundColor: val })
              }}
              className="h-10 w-full cursor-pointer rounded border border-slate-600 bg-slate-900"
            />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium text-slate-100">背景内边距</span>
              <span className="text-xs text-slate-400">{backgroundPadding}px</span>
            </div>
            <Slider
              value={backgroundPadding}
              min={0}
              max={60}
              step={2}
              onChange={(v) => {
                setBackgroundPadding(v)
                emitChange({ backgroundPadding: v })
              }}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium text-slate-100">背景圆角</span>
              <span className="text-xs text-slate-400">{backgroundRadius}px</span>
            </div>
            <Slider
              value={backgroundRadius}
              min={0}
              max={40}
              step={1}
              onChange={(v) => {
                setBackgroundRadius(v)
                emitChange({ backgroundRadius: v })
              }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block font-medium text-slate-100">阴影颜色</label>
            <input
              type="color"
              value={shadowColor}
              onChange={(e) => {
                setShadowColor(e.target.value)
                emitChange({ shadowColor: e.target.value })
              }}
              className="h-10 w-full cursor-pointer rounded border border-slate-600 bg-slate-900"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium text-slate-100">阴影模糊</span>
              <span className="text-xs text-slate-400">{shadowBlur}px</span>
            </div>
            <Slider
              value={shadowBlur}
              min={0}
              max={30}
              step={1}
              onChange={(v) => {
                setShadowBlur(v)
                emitChange({ shadowBlur: v })
              }}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium text-slate-100">阴影偏移 X</span>
              <span className="text-xs text-slate-400">{shadowOffsetX}px</span>
            </div>
            <Slider
              value={shadowOffsetX}
              min={-30}
              max={30}
              step={1}
              onChange={(v) => {
                setShadowOffsetX(v)
                emitChange({ shadowOffsetX: v })
              }}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium text-slate-100">阴影偏移 Y</span>
              <span className="text-xs text-slate-400">{shadowOffsetY}px</span>
            </div>
            <Slider
              value={shadowOffsetY}
              min={-30}
              max={30}
              step={1}
              onChange={(v) => {
                setShadowOffsetY(v)
                emitChange({ shadowOffsetY: v })
              }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block font-medium text-slate-100">填充颜色</label>
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value)
                emitChange({ color: e.target.value })
              }}
              className="h-10 w-full cursor-pointer rounded border border-slate-600 bg-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-100">背景颜色</label>
            <input
              type="color"
              value={backgroundColor === 'transparent' ? '#000000' : backgroundColor}
              onChange={(e) => {
                const val = e.target.value
                setBackgroundColor(val)
                emitChange({ backgroundColor: val })
              }}
              className="h-10 w-full cursor-pointer rounded border border-slate-600 bg-slate-900"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block font-medium">对齐方式</label>
        <div className="flex gap-2">
          {(['left', 'center', 'right'] as const).map((alignment) => (
            <Button
              key={alignment}
              variant={align === alignment ? 'primary' : 'ghost'}
              onClick={() => {
                setAlign(alignment)
                emitChange({ align: alignment })
              }}
              className="flex-1"
            >
              {alignment === 'left' ? '左' : alignment === 'center' ? '中' : '右'}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-sm">
        <label className="mb-1 block font-medium text-slate-100">样式</label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={bold ? 'primary' : 'ghost'}
            onClick={() => {
              setBold((prev) => {
                const next = !prev
                emitChange({ bold: next })
                return next
              })
            }}
            className="w-full"
          >
            <strong>粗体</strong>
          </Button>
          <Button
            variant={italic ? 'primary' : 'ghost'}
            onClick={() => {
              setItalic((prev) => {
                const next = !prev
                emitChange({ italic: next })
                return next
              })
            }}
            className="w-full"
          >
            <em>斜体</em>
          </Button>
          <Button
            variant={underline ? 'primary' : 'ghost'}
            onClick={() => {
              setUnderline((prev) => {
                const next = !prev
                emitChange({ underline: next })
                return next
              })
            }}
            className="w-full"
          >
            下划线
          </Button>
          <Button
            variant={strike ? 'primary' : 'ghost'}
            onClick={() => {
              setStrike((prev) => {
                const next = !prev
                emitChange({ strike: next })
                return next
              })
            }}
            className="w-full"
          >
            删除线
          </Button>
        </div>
      </div>

      {!isEditMode && (
        <>
          <Button variant="primary" onClick={handleAdd} disabled={!text.trim()}>
            添加文本
          </Button>
          <div className="text-xs text-slate-500">
            <p>点击"添加文本"后，文本将出现在画布中心，您可以拖拽移动位置</p>
          </div>
        </>
      )}
      
      {isEditMode && (
        <div className="text-xs text-slate-400 italic">
          <p>修改将自动保存</p>
        </div>
      )}
    </div>
  )
}

