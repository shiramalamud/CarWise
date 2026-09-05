"use client"
import React from 'react'

export default function Input(props: React.ComponentProps<'input'>) {
  return (
    <input {...props} className={`w-full px-3 py-2 border rounded-md bg-white text-sm ${props.className || ''}`}/>
  )
}
