import React from 'react'

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 bg-white rounded-lg shadow ${className}`}>{children}</div>
}
