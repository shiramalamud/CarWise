"use client"
import Link from 'next/link'
import React from 'react'

export default function HomeNavCards() {
  const cards = [
    { title: 'My Cars', href: '/cars', desc: 'View and manage family cars' },
    { title: 'Calendar', href: '/calendar', desc: 'Maintenance, tests and insurance dates' },
    { title: 'Chat', href: '/chat', desc: 'Ask the AI agent about your car' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
      {cards.map(c => (
        <Link key={c.href} href={c.href} className="block p-6 bg-white rounded-lg shadow hover:shadow-md">
          <h3 className="text-lg font-semibold">{c.title}</h3>
          <p className="text-sm text-gray-600 mt-2">{c.desc}</p>
        </Link>
      ))}
    </div>
  )
}
