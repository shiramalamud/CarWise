import React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'ghost'
}

export default function Button({ children, variant = 'default', className = '', ...props }: ButtonProps) {
  const base = 'inline-flex items-center px-4 py-2 rounded-md text-sm font-medium'
  const styles = variant === 'ghost' ? 'bg-transparent hover:bg-gray-100' : 'bg-sky-600 text-white hover:bg-sky-700'
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  )
}
