"use client"
import React from 'react'

export default function Card({ children, className = '', style }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`} style={style}>
      {children}
    </div>
  )
}
