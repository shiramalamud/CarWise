"use client"
import React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'teal' | 'outline' }

export default function Button({ variant = 'primary', className = '', children, ...rest }: Props) {
  const base = 'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors'
  const variants: Record<string,string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-500 shadow-sm',
    ghost: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    teal: 'bg-brand-600 text-white hover:bg-brand-500 shadow-sm',
    outline: 'bg-transparent text-brand-700 border border-brand-600 hover:bg-brand-50',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}
