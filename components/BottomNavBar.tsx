"use client"
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Car, Calendar, MessageCircle } from 'lucide-react'

export default function BottomNavBar() {
  const pathname = usePathname() || '/'
  const items = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Cars', href: '/cars', icon: Car },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'AI Chat', href: '/chat', icon: MessageCircle },
  ]

  return (
    // z-40: must always outrank ordinary page content (which can carry z-10 for its
    // own internal layering) so this stays clickable everywhere; kept below modals/dialogs (z-50).
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t">
      <div className="max-w-4xl mx-auto flex justify-around py-2">
        {items.map(it => {
          const active = pathname === it.href
          const Icon = it.icon
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`w-1/4 flex flex-col items-center justify-center gap-1 py-2 rounded-md text-xs font-medium transition-colors ${
                active ? 'bg-brand-600 text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} />
              <span>{it.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
