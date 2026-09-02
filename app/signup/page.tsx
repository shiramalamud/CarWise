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
      setError(signErr.message)
      setLoading(false)
      return
    }

    const user = signData.user
    if (!user) {
      setError('Please confirm your email (check inbox).')
      setLoading(false)
      return
    }

    try {
      let familyId = null
      if (mode === 'create') {
        const code = generateFamilyCode()
        const { data: fam } = await supabase.from('families').insert({ code_family: code }).select().single()
        familyId = fam.id
      } else {
        const { data: fams } = await supabase.from('families').select().eq('code_family', joinCode).limit(1)
        if (!fams || fams.length === 0) {
          setError('Family code not found')
          setLoading(false)
          return
        }
        familyId = fams[0].id
      }

      // insert profile linked to auth user id
      await supabase.from('profiles').insert({ id: user.id, id_family: familyId, name_full: name, email })

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
