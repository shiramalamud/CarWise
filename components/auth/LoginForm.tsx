"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

type LoginFormProps = {
  onSuccess?: () => void
  /** When provided, renders "Sign up" as a button that calls this instead of a Link to /signup (for modal use). */
  onSwitchToSignup?: () => void
}

export default function LoginForm({ onSuccess, onSwitchToSignup }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setLoading(false)
    if (onSuccess) onSuccess()
    else router.replace('/')
  }

  return (
    <div className="bg-white rounded-2xl p-8">
      <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
      <p className="text-sm text-slate-500 mb-6">Log in to manage your family&apos;s cars.</p>

      {error && <div className="mb-4 text-sm rounded-lg bg-red-50 text-red-700 px-3 py-2">{error}</div>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
            required
          />
        </div>
        <button
          disabled={loading}
          className="w-full rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 transition-colors disabled:opacity-60"
        >
          {loading ? 'Please wait…' : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        {onSwitchToSignup ? (
          <button type="button" onClick={onSwitchToSignup} className="font-semibold text-teal-600 hover:text-teal-700">Sign up</button>
        ) : (
          <Link href="/signup" className="font-semibold text-teal-600 hover:text-teal-700">Sign up</Link>
        )}
      </p>
    </div>
  )
}
