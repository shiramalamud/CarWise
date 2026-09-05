"use client"
import React from 'react'

export default function Badge({ children, color = 'gray' }: { children: React.ReactNode, color?: 'red'|'yellow'|'gray'|'green' }) {
  const colors: Record<string,string> = {
    red: 'bg-amber-600 text-white',
    yellow: 'bg-amber-400 text-black',
    gray: 'bg-gray-200 text-gray-800',
    green: 'bg-green-600 text-white'
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${colors[color] || colors.gray}`}>
      {children}
    </span>
  )
}
