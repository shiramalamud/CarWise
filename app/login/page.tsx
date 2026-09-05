"use client"
import React from 'react'
import Link from 'next/link'
import { CarFront } from 'lucide-react'
import LoginForm from '../../components/auth/LoginForm'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-950 via-teal-900 to-teal-800 px-6 py-12">
      <div className="w-full max-w-sm animate-fade-in-up">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-sm">
            <CarFront size={20} />
          </div>
          <span className="font-display text-2xl font-bold text-white">CarWise</span>
        </Link>

        <div className="rounded-2xl shadow-2xl overflow-hidden">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
