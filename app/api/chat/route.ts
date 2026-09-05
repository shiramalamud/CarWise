import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This route reads per-user, per-family data on every request (active cars,
// chat history) via a Supabase client that runs server-side under Next's App
// Router. Route Handlers can otherwise be eligible for full-route/data
// caching, which would silently serve one family's stale snapshot to a
// later, materially different request — force this route to always execute
// fresh, and never let the underlying fetch() calls get cached either.
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

function noStoreFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, cache: 'no-store' })
}

async function callGemini(prompt: string) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`
  const body = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`Gemini API error: ${txt}`)
  }
  const respJson = await resp.json()

  // Extract text from candidates[0].content.parts[0].text (preferred)
  let textOutput: string | null = null
  try {
    if (respJson?.candidates && Array.isArray(respJson.candidates) && respJson.candidates.length > 0) {
      const cand = respJson.candidates[0]
      if (cand?.content?.parts && Array.isArray(cand.content.parts) && cand.content.parts.length > 0) {
        const p0 = cand.content.parts[0]
        if (p0 && typeof p0.text === 'string' && p0.text.trim().length > 0) textOutput = p0.text.trim()
      }
      if (!textOutput && cand.content && Array.isArray(cand.content)) {
        const texts = cand.content.map((c: any) => (c && typeof c.text === 'string' ? c.text : null)).filter(Boolean)
        if (texts.length) textOutput = texts.join('\n')
      }
      if (!textOutput && cand.output) textOutput = JSON.stringify(cand.output)
    }

    if (!textOutput && respJson?.output && Array.isArray(respJson.output)) {
      for (const item of respJson.output) {
        if (item?.content && Array.isArray(item.content)) {
          for (const part of item.content) {
            if (part?.parts && Array.isArray(part.parts) && part.parts.length > 0) {
              const p0 = part.parts[0]
              if (p0 && typeof p0.text === 'string') {
                textOutput = p0.text
                break
              }
            }
            if (part?.text && typeof part.text === 'string') {
              textOutput = part.text
              break
            }
          }
        }
        if (textOutput) break
      }
    }
  } catch (e) {
    // ignore
  }

  if (!textOutput) textOutput = JSON.stringify(respJson)
  return textOutput
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return NextResponse.json({ error: 'Missing access token' }, { status: 401 })

    console.log('[api/chat GET] incoming token present, len=', token.length)

    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` }, fetch: noStoreFetch } })

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    console.log('[api/chat GET] supabase.auth.getUser result:', { userErr, userData })
    let userId: string | undefined
    if (userErr || !userData?.user?.id) {
      // fallback: try Supabase Auth REST endpoint
      try {
        console.log('[api/chat GET] getUser failed, trying /auth/v1/user fallback')
        const fallback = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey } })
        const fbJson = await fallback.json().catch(() => null)
        console.log('[api/chat GET] fallback /auth/v1/user:', { status: fallback.status, body: fbJson })
        userId = fbJson?.id
        if (!userId) return NextResponse.json({ error: 'Unable to authenticate user (fallback failed)' }, { status: 401 })
      } catch (fbErr: any) {
        console.error('[api/chat GET] fallback error', fbErr)
        return NextResponse.json({ error: 'Unable to authenticate user' }, { status: 401 })
      }
    } else {
      userId = userData.user.id
    }
    

    const { data: profile, error: profileErr } = await supabase.from('profiles').select('family_id').eq('id', userId).single()
    if (profileErr || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    const familyId = profile.family_id

    const { data: messages } = await supabase.from('chat_messages').select('*').eq('id_family', familyId).order('at_created', { ascending: true })

    return NextResponse.json({ messages: messages || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return NextResponse.json({ error: 'Missing access token' }, { status: 401 })

    console.log('[api/chat POST] incoming token present, len=', token.length)

    const body = await req.json()
    const userMessage = body?.message?.toString?.() || ''
    if (!userMessage) return NextResponse.json({ error: 'Missing message' }, { status: 400 })

    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` }, fetch: noStoreFetch } })

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    console.log('[api/chat POST] supabase.auth.getUser result:', { userErr, userData })
    let userId: string | undefined
    if (userErr || !userData?.user?.id) {
      try {
        console.log('[api/chat POST] getUser failed, trying /auth/v1/user fallback')
        const fallback = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey } })
        const fbJson = await fallback.json().catch(() => null)
        console.log('[api/chat POST] fallback /auth/v1/user:', { status: fallback.status, body: fbJson })
        userId = fbJson?.id
        if (!userId) return NextResponse.json({ error: 'Unable to authenticate user (fallback failed)' }, { status: 401 })
      } catch (fbErr: any) {
        console.error('[api/chat POST] fallback error', fbErr)
        return NextResponse.json({ error: 'Unable to authenticate user' }, { status: 401 })
      }
    } else {
      userId = userData.user.id
    }

    const { data: profile, error: profileErr } = await supabase.from('profiles').select('family_id, full_name, email').eq('id', userId).single()
    if (profileErr || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    const familyId = profile.family_id
    // The name of whoever is authenticated on THIS request — resolved fresh from
    // the request's own JWT, never from chat history — so it's always correct
    // even though this thread is shared by every member of the family.
    const currentSenderName = profile.full_name?.trim() || profile.email?.split('@')[0] || 'there'

    // Fetch family cars — only "active" ones are presented as the family's
    // current fleet (matches how Home/Calendar/car-count treat status
    // elsewhere in the app); a sold car left unfiltered here previously,
    // undifferentiated from active ones, was extra ambiguity for the model
    // to resolve on its own with no guidance.
    const { data: allCars } = await supabase.from('cars').select('*').eq('id_family', familyId)
    const activeCars = (allCars || []).filter((c: any) => c.status === 'active')
    const soldCarsCount = (allCars || []).length - activeCars.length
    const carIds = activeCars.map((c: any) => c.id)

    let recentRecords: any[] = []
    if (carIds.length > 0) {
      const { data } = await supabase.from('maintenance_records').select('*').in('car_id', carIds).order('date', { ascending: false }).limit(20)
      recentRecords = data || []
    }

    // Build reminders: simple client of expiry dates
    const reminders: any[] = []
    for (const c of activeCars) {
      if (c.insurance_expiry_date) reminders.push({ carId: c.id, type: 'insurance', date: c.insurance_expiry_date })
      if (c.test_expiry_date) reminders.push({ carId: c.id, type: 'test', date: c.test_expiry_date })
      if (c.last_service_date) reminders.push({ carId: c.id, type: 'service', date: c.last_service_date })
    }

    const context = {
      activeCars,
      soldCarsCount,
      recentMaintenance: recentRecords,
      reminders
    }

    // A plain-language fact the model can't misread the way it might a raw
    // JSON dump — stated up front, independent of how well it parses the JSON.
    const activeCarSummary = activeCars.length === 0
      ? 'This family currently has NO active cars on file.'
      : `This family currently has ${activeCars.length} active car(s): ` +
        activeCars.map((c: any) => `${c.year} ${c.make} ${c.model} (plate ${c.plate_license})`).join(', ') + '.'

    // Recent shared history, for continuity — but since chat_messages has no
    // per-message sender column, a "user" line's original author genuinely
    // cannot be identified. Label it honestly as unattributed rather than
    // guessing, and lean on the explicit CURRENT MESSAGE block below for the
    // one identity claim we can actually stand behind.
    const { data: historyRaw } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('id_family', familyId)
      .order('at_created', { ascending: false })
      .limit(10)
    const history = (historyRaw || []).slice().reverse()
    const historyText = history.length === 0
      ? '(no earlier messages in this conversation)'
      : history.map((m: any) => m.role === 'assistant' ? `Assistant: ${m.content}` : `A family member (could be a different person than whoever is asking now): ${m.content}`).join('\n')

    // Build prompt
    const prompt = `You are the CarWise assistant for a family that shares one car-maintenance account together — several people may use this same chat thread.

FAMILY CAR DATA (ground truth — trust this over any assumption, and never contradict it):
${activeCarSummary}
Full details as JSON: ${JSON.stringify(context)}

SHARED CONVERSATION HISTORY (may include messages from other family members, not just the current sender):
${historyText}

CURRENT MESSAGE:
The person sending this message right now is named "${currentSenderName}". Address them directly and by name. Do not address, or assume you are talking to, any other name — even one that appears in the conversation history above; that history may belong to a different family member than whoever is asking now.
${currentSenderName} says: "${userMessage}"

Respond with a JSON object: { "reply": "..." } and nothing else.`

    // Save user message
    await supabase.from('chat_messages').insert([{ id_family: familyId, role: 'user', content: userMessage }])

    // Call Gemini
    const modelText = await callGemini(prompt)

    // modelText may be JSON or plain text; try to parse
    let assistantReply = ''
    try {
      const parsed = JSON.parse(modelText)
      assistantReply = parsed.reply || parsed.explanation || (typeof parsed === 'string' ? parsed : JSON.stringify(parsed))
    } catch (e) {
      // If model returned plain text, use it directly
      assistantReply = modelText
    }

    // Save assistant reply
    await supabase.from('chat_messages').insert([{ id_family: familyId, role: 'assistant', content: assistantReply }])

    return NextResponse.json({ reply: assistantReply })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
