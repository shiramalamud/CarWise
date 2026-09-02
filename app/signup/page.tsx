"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { generateFamilyCode } from '../../lib/utils'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'create'|'join'>('create')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      if (mode === 'create') {
        const code = generateFamilyCode()
        // Log session to help debug permission issues (shows whether request is authenticated)
        // Visible in browser console during signup
        console.log('supabase session before creating family:', session)
        const { data: fam, error: famErr } = await supabase.from('families').insert({ code_family: code }).select().single()
        if (famErr) throw famErr
        familyId = fam.id
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

      router.replace('/')
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <form onSubmit={onSubmit} className="w-full max-w-md p-6 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Sign up</h2>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <label className="block mb-2">Name
          <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 p-2 border rounded" />
        </label>
        <label className="block mb-2">Email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 p-2 border rounded" />
        </label>
        <label className="block mb-2">Password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 p-2 border rounded" />
        </label>

        <div className="mt-4">
          <label className="mr-4">
            <input type="radio" checked={mode === 'create'} onChange={() => setMode('create')} /> Create family
          </label>
          <label>
            <input type="radio" checked={mode === 'join'} onChange={() => setMode('join')} /> Join family
          </label>
        </div>

        {mode === 'join' && (
          <label className="block mt-2">Family Code
            <input value={joinCode} onChange={e => setJoinCode(e.target.value)} className="w-full mt-1 p-2 border rounded" />
          </label>
        )}

        <div className="flex items-center justify-between mt-4">
          <button className="px-4 py-2 bg-sky-600 text-white rounded" disabled={loading}>{loading ? 'Please wait' : 'Sign up'}</button>
          <a className="text-sm text-sky-600" href="/login">Have an account? Log in</a>
        </div>
      </form>
    </main>
  )
}
