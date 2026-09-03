"use client"

import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Msg = { id: string; role: string; content: string; at_created?: string }

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const tokenRef = useRef<string | null>(null)

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

    const id = setInterval(() => { const t = tokenRef.current; if (t) fetchMessagesWithToken(t) }, 5000)
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
    console.log('[chat] sendMessage entered', { input })
    if (!input.trim()) {
      console.log('[chat] sendMessage aborted: empty input')
      return
    }
    setLoading(true)
    setError(null)
    const tok = tokenRef.current
    console.log('[chat] sendMessage using tokenRef.current:', tok)
    if (!tok) {
      console.log('[chat] sendMessage aborted: missing tokenRef.current')
      setLoading(false)
      setError('Not authenticated')
      return
    }
    try {
      const payload = { message: input }
      console.log('[chat] sendMessage tokenRef:', tok)
      console.log('[chat] sendMessage payload:', payload)
      console.log('[chat] sendMessage about to call fetch')
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify(payload)
      })
      const text = await res.text()
      console.log('[chat] sendMessage response status:', res.status)
      console.log('[chat] sendMessage raw body:', text)
      if (res.ok) {
        let j: any = null
        try { j = JSON.parse(text) } catch { j = { reply: text } }
        setMessages(prev => [...prev, { id: String(Math.random()), role: 'user', content: input }, { id: String(Math.random()+1), role: 'assistant', content: j.reply }])
        setInput('')
        setError(null)
      } else {
        setError(`Send failed: ${text || res.status}`)
        console.error('chat send failed', res.status, text)
      }
    } catch (err: any) {
      console.error('[chat] sendMessage error', err)
      setError(String(err.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Chat with CarWise</h1>
      <div className="border rounded p-4 h-96 overflow-auto mb-4 bg-white">
        {messages.length === 0 && <div className="text-sm text-gray-500">No messages yet.</div>}
        {messages.map(m => (
          <div key={m.id} className={m.role === 'assistant' ? 'mb-3' : 'mb-3 text-right'}>
            <div className={`inline-block px-3 py-2 rounded ${m.role === 'assistant' ? 'bg-gray-100 text-left' : 'bg-blue-500 text-white'}`}>
              <div className="text-sm">{m.content}</div>
              <div className="text-xs text-gray-400 mt-1">{m.role}</div>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="mb-2 text-red-600">{error}</div>}
      <form onSubmit={sendMessage} className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="Ask about your car..." />
        <button onClick={() => console.log('[chat] send button clicked')} disabled={loading || !input.trim()} type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">{loading ? 'Sending...' : 'Send'}</button>
      </form>
    </div>
  )
}

