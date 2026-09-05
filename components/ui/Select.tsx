"use client"
import React from 'react'

export default function Select(props: React.ComponentProps<'select'>) {
  return (
    <select {...props} className={`w-full px-3 py-2 border rounded-md bg-white text-sm ${props.className || ''}`}>
      {props.children}
    </select>
  )
}
