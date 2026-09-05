"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Copy } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { generateFamilyCode } from '../../lib/utils'

type SignupFormProps = {
  onSuccess?: () => void
  /** When provided, renders "Log in" as a button that calls this instead of a Link to /login (for modal use). */
  onSwitchToLogin?: () => void
}

export default function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'create'|'join'>('create')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Set only right after a brand-new family is created — shows a confirmation
  // screen with the code before continuing, since it's otherwise never surfaced.
  const [createdFamilyCode, setCreatedFamilyCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: signData, error: signErr } = await supabase.auth.signUp({ email, password })

    if (signErr) {
      // Friendly handling for already-registered email
      if (signErr.message && /already registered|email.*already|user.*exists/i.test(signErr.message)) {
        // Check if there's an existing profile record for this email
        try {
          const { data: existingProfiles } = await supabase.from('profiles').select().eq('email', email).limit(1)
          if (existingProfiles && existingProfiles.length > 0) {
            setError('An account with this email already exists. There is a profile record in the database — if you deleted the Auth user please also delete the profile in the Supabase dashboard before retrying. Otherwise log in or reset your password.')
          } else {
            setError('An account with this email already exists. Please log in or reset your password.')
          }
        } catch (qErr) {
          setError('An account with this email already exists. Please log in or reset your password.')
        }
      } else {
        setError(signErr.message)
      }
      setLoading(false)
      return
    }

    const user = signData?.user
    // Try to obtain a valid session: either from signUp response or from the client
    const sessionFromResponse = (signData as any)?.session
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionFromResponse ?? sessionData?.session

    // If no user or no session, likely email confirmation is required
    if (!user || !session) {
      setError('Signup initiated. Please check your email to confirm your account before continuing.')
      setLoading(false)
      return
    }

    try {
      let familyId: string | null = null
      let newFamilyCode: string | null = null
      if (mode === 'create') {
        const code = generateFamilyCode()
        const { data: fam, error: famErr } = await supabase.from('families').insert({ code_family: code }).select().single()
        if (famErr) throw famErr
        familyId = fam.id
        newFamilyCode = code
      } else {
        const { data: fams, error: famErr } = await supabase.from('families').select().eq('code_family', joinCode).limit(1)
        if (famErr) throw famErr
        if (!fams || fams.length === 0) {
          setError('Family code not found')
          setLoading(false)
          return
        }
        familyId = fams[0].id
      }

      // Upsert profile linked to auth user id (handles retries / existing rows)
      const { error: profileErr } = await supabase.from('profiles').upsert({ id: user.id, family_id: familyId, full_name: name, email }, { onConflict: 'id' })
      if (profileErr) throw profileErr

      setLoading(false)
      if (newFamilyCode) {
        // Don't continue yet — show the code first so it can actually be shared.
        setCreatedFamilyCode(newFamilyCode)
      } else if (onSuccess) {
        onSuccess()
      } else {
        router.replace('/')
      }
    } catch (err: any) {
      setError(err.message || String(err))
      setLoading(false)
    }
  }

  const handleCopyCode = async () => {
    if (!createdFamilyCode) return
    try {
      await navigator.clipboard.writeText(createdFamilyCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API unavailable — the code is still visible on screen to copy manually
    }
  }

  const handleContinue = () => {
    if (onSuccess) onSuccess()
    else router.replace('/')
  }

  if (createdFamilyCode) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-teal-100 flex items-center justify-center mb-4">
          <Check size={28} className="text-teal-600" />
        </div>
        <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Your family is set up!</h2>
        <p className="text-sm text-slate-500 mb-6">Share this code with your family so they can join.</p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Family code</div>
          <div className="font-display text-3xl font-bold tracking-[0.2em] text-slate-900">{createdFamilyCode}</div>
        </div>

        <button
          type="button"
          onClick={handleCopyCode}
          className="w-full rounded-lg border border-teal-600 text-teal-700 font-semibold py-2.5 mb-3 hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"
        >
          {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy code</>}
        </button>

        <button
          type="button"
          onClick={handleContinue}
          className="w-full rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 transition-colors"
        >
          Continue
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-8">
      <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Create your account</h2>
      <p className="text-sm text-slate-500 mb-6">Start tracking your family&apos;s cars in minutes.</p>

      {error && <div className="mb-4 text-sm rounded-lg bg-red-50 text-red-700 px-3 py-2">{error}</div>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`rounded-md py-2 text-sm font-medium transition-colors ${mode === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Create family
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`rounded-md py-2 text-sm font-medium transition-colors ${mode === 'join' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Join family
          </button>
        </div>

        {mode === 'join' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Family code</label>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
            />
          </div>
        )}

        <button
          disabled={loading}
          className="w-full rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 transition-colors disabled:opacity-60"
        >
          {loading ? 'Please wait…' : 'Sign up'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Have an account?{' '}
        {onSwitchToLogin ? (
          <button type="button" onClick={onSwitchToLogin} className="font-semibold text-teal-600 hover:text-teal-700">Log in</button>
        ) : (
          <Link href="/login" className="font-semibold text-teal-600 hover:text-teal-700">Log in</Link>
        )}
      </p>
    </div>
  )
}
