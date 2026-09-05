"use client"

import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import NavBar from '../../components/NavBar'
import { CarFront } from 'lucide-react'

type Msg = { id: string; role: string; content: string; at_created?: string }

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  const sendingRef = useRef(false)

  useEffect(() => { tokenRef.current = token }, [token])

  useEffect(() => {
    console.log('[chat] mounted')
    let mounted = true

    const init = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const t = sessionData?.session?.access_token || null
        console.log('[chat] initial token from getSession:', t, { sessionData })
        if (mounted) setToken(t)
        tokenRef.current = t
        if (t) fetchMessagesWithToken(t)
      } catch (e) {
        console.error('[chat] getSession error', e)
      }
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const t = (session as any)?.access_token || null
      console.log('[chat] onAuthStateChange', event, t)
      setToken(t)
      tokenRef.current = t
      if (t) fetchMessagesWithToken(t)
    })

    // Skip polling while a send is in flight — otherwise a poll landing between
    // the server saving the message and this tab's own POST resolving would show
    // it once from the poll, then again when sendMessage appends its local copy.
    const id = setInterval(() => { const t = tokenRef.current; if (t && !sendingRef.current) fetchMessagesWithToken(t) }, 5000)
    return () => {
      mounted = false
      clearInterval(id)
      try { sub?.subscription?.unsubscribe() } catch {}
    }
  }, [])

  async function fetchMessagesWithToken(tok: string) {
    if (!tok) return
    try {
      console.log('[chat] fetchMessages token:', tok)
      const res = await fetch('/api/chat', { headers: { Authorization: `Bearer ${tok}` } })
      console.log('[chat] fetchMessages response status:', res.status)
      const j = await res.json().catch(() => null)
      console.log('[chat] fetchMessages response body:', j)
      if (res.ok) {
        setMessages(j?.messages || [])
        setError(null)
      } else {
        setError((j && j.error) || `Fetch messages failed: ${res.status}`)
      }
    } catch (err: any) {
      console.error('[chat] fetchMessages error', err)
      setError(String(err.message || err))
    }
  }

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    if (!input.trim()) return
    const tok = tokenRef.current
    if (!tok) {
      setError('Not authenticated')
      return
    }
    setLoading(true)
    setError(null)
    sendingRef.current = true
    const messageToSend = input
    // Optimistic: show the user's own message immediately, with a temporary id.
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: messageToSend }])
    setInput('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ message: messageToSend })
      })
      const text = await res.text()
      if (res.ok) {
        setError(null)
        // Resync from the server (the single source of truth) instead of appending
        // a second local copy — avoids double-counting against the polling GET above.
        await fetchMessagesWithToken(tok)
      } else {
        setError(`Send failed: ${text || res.status}`)
        // Sending failed: drop the optimistic message and give the input back.
        setMessages(prev => prev.filter(m => m.id !== tempId))
        setInput(messageToSend)
      }
    } catch (err: any) {
      setError(String(err.message || err))
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setInput(messageToSend)
    } finally {
      setLoading(false)
      sendingRef.current = false
    }
  }

  return (
    <main className="min-h-screen flex flex-col relative bg-white">
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-teal-950 via-teal-900 to-teal-900/0 pointer-events-none overflow-hidden">
        <CarFront className="absolute -right-10 -top-6 text-white/5" size={260} strokeWidth={1} />
      </div>

      <div className="relative z-10">
        <NavBar dark />
      </div>

      <div className="relative z-10 flex-1 px-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl font-bold text-white mb-6">Chat with CarWise AI</h1>
          <div className="border border-slate-100 rounded-2xl shadow-md p-4 h-96 overflow-auto mb-4 bg-white">
            {messages.length === 0 && <div className="text-sm text-gray-500">No messages yet.</div>}
            {messages.map(m => (
              <div key={m.id} className={m.role === 'assistant' ? 'mb-3' : 'mb-3 text-right'}>
                <div className={`inline-block px-3 py-2 rounded ${m.role === 'assistant' ? 'bg-gray-100 text-left' : 'bg-teal-600 text-white'}`}>
                  <div className="text-sm">{m.content}</div>
                  <div className="text-xs text-gray-400 mt-1">{m.role}</div>
                </div>
              </div>
            ))}
          </div>

          {error && <div className="mb-2 text-red-100 bg-red-600/80 rounded-lg px-3 py-2 text-sm">{error}</div>}
          <form onSubmit={sendMessage} className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 bg-white" placeholder="Ask about your car..." />
            <button disabled={loading || !input.trim()} type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-60">{loading ? 'Sending...' : 'Send'}</button>
          </form>
        </div>
      </div>
    </main>
  )
}

