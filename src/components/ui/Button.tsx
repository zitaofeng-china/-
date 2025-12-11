/**
 * 按钮组件
 * 提供统一风格的按钮UI，支持主要和次要两种样式变体
 */
import React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }

export function Button({ variant = 'primary', className = '', children, ...rest }: Props) {
  const base = 'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition'
  const variants: Record<string, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    ghost: 'text-slate-700 hover:bg-slate-100'
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}

