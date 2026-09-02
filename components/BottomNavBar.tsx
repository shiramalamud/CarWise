"use client"
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNavBar() {
  const pathname = usePathname() || '/'
  const items = [
    { label: 'Home', href: '/' },
    { label: 'Cars', href: '/cars' },
    { label: 'Calendar', href: '/calendar' },
    { label: 'Chat', href: '/chat' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
      <div className="max-w-4xl mx-auto flex justify-around py-2">
        {items.map(it => (
          <Link key={it.href} href={it.href} className={`text-sm ${pathname === it.href ? 'text-sky-600' : 'text-gray-600'}`}>
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
