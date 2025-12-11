/**
 * 文本工具组件
 * 提供在图像上添加和编辑文本功能的用户界面
 */
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '../../components/ui/Button'
import Slider from '../../components/ui/Slider'
import { getDefaultTextConfig, type TextLayer } from './text.service'
import { debounce } from '../../utils/debounce'

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
  const isInitialMount = useRef(true)

  // 当initialConfig变化时更新状态
  useEffect(() => {
    if (initialConfig) {
      setText(initialConfig.text)
      setFontSize(initialConfig.fontSize)
      setColor(initialConfig.color)
      setAlign(initialConfig.align)
      setBold(initialConfig.bold)
      setItalic(initialConfig.italic)
    }
  }, [initialConfig])

  // 生成当前配置
  const getCurrentConfig = useCallback((): Omit<TextLayer, 'id' | 'x' | 'y'> => {
    return {
      text: text.trim() || ' ', // 空文本时使用空格，避免图层消失
      fontSize,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color,
      align,
      bold,
      italic
    }
  }, [text, fontSize, color, align, bold, italic])

  // 创建防抖的更新函数（文本输入使用较长防抖时间，其他属性使用较短时间）
  const debouncedTextUpdate = useRef(
    debounce((config: Omit<TextLayer, 'id' | 'x' | 'y'>) => {
      if (onChange && isEditMode) {
        onChange(config)
      }
    }, 500) // 文本输入500ms防抖
  ).current

  const debouncedOtherUpdate = useRef(
    debounce((config: Omit<TextLayer, 'id' | 'x' | 'y'>) => {
      if (onChange && isEditMode) {
        onChange(config)
      }
    }, 200) // 其他属性200ms防抖
  ).current

  // 当文本内容变化时，在编辑模式下实时更新（使用较长防抖）
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (isEditMode && onChange) {
      const config = getCurrentConfig()
      debouncedTextUpdate(config)
    }
  }, [text, isEditMode, onChange, getCurrentConfig, debouncedTextUpdate])

  // 当其他属性变化时，在编辑模式下实时更新（使用较短防抖）
  useEffect(() => {
    if (isInitialMount.current) {
      return
    }

    if (isEditMode && onChange) {
      const config = getCurrentConfig()
      debouncedOtherUpdate(config)
    }
  }, [fontSize, color, align, bold, italic, isEditMode, onChange, getCurrentConfig, debouncedOtherUpdate])

  const handleAdd = () => {
    if (!text.trim()) return

    onAddText?.({
      text: text.trim(),
      fontSize,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color,
      align,
      bold,
      italic
    })

    // 如果不是编辑模式，重置为默认值
    if (!isEditMode) {
      const defaultConfig = getDefaultTextConfig()
      setText(defaultConfig.text)
      setFontSize(defaultConfig.fontSize)
      setColor(defaultConfig.color)
      setAlign(defaultConfig.align)
      setBold(defaultConfig.bold)
      setItalic(defaultConfig.italic)
    }
  }

  return (
    <div className="flex flex-col gap-4 text-sm text-slate-700">
      <div>
        <label className="mb-1 block font-medium">文本内容</label>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            // 对于文本输入，实时更新（防抖已在useEffect中处理）
          }}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={3}
          placeholder="输入文本..."
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="font-medium">字体大小</span>
          <span className="text-xs text-slate-500">{fontSize}px</span>
        </div>
        <Slider value={fontSize} min={12} max={72} onChange={setFontSize} />
      </div>

      <div>
        <label className="mb-1 block font-medium">颜色</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-full cursor-pointer rounded border border-slate-200"
        />
      </div>

      <div>
        <label className="mb-1 block font-medium">对齐方式</label>
        <div className="flex gap-2">
          {(['left', 'center', 'right'] as const).map((alignment) => (
            <Button
              key={alignment}
              variant={align === alignment ? 'primary' : 'ghost'}
              onClick={() => setAlign(alignment)}
              className="flex-1"
            >
              {alignment === 'left' ? '左' : alignment === 'center' ? '中' : '右'}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block font-medium">样式</label>
        <div className="flex gap-2">
          <Button
            variant={bold ? 'primary' : 'ghost'}
            onClick={() => setBold(!bold)}
            className="flex-1"
          >
            <strong>粗体</strong>
          </Button>
          <Button
            variant={italic ? 'primary' : 'ghost'}
            onClick={() => setItalic(!italic)}
            className="flex-1"
          >
            <em>斜体</em>
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

