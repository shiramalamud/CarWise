import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })

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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })

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

    const { data: profile, error: profileErr } = await supabase.from('profiles').select('family_id, full_name').eq('id', userId).single()
    if (profileErr || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    const familyId = profile.family_id

    // Fetch family cars and recent maintenance records
    const { data: cars } = await supabase.from('cars').select('*').eq('id_family', familyId)
    const carIds = (cars || []).map((c: any) => c.id)

    const { data: recentRecords } = await supabase.from('maintenance_records').select('*').in('car_id', carIds).order('date', { ascending: false }).limit(20)

    // Build reminders: simple client of expiry dates
    const reminders: any[] = []
    const today = new Date()
    for (const c of (cars || [])) {
      if (c.insurance_expiry_date) reminders.push({ carId: c.id, type: 'insurance', date: c.insurance_expiry_date })
      if (c.test_expiry_date) reminders.push({ carId: c.id, type: 'test', date: c.test_expiry_date })
      if (c.last_service_date) reminders.push({ carId: c.id, type: 'service', date: c.last_service_date })
    }

    const context = {
      family: { id: familyId, memberName: profile.full_name },
      cars: cars || [],
      recentMaintenance: recentRecords || [],
      reminders
    }

    // Build prompt
    const prompt = `You are CarWise assistant. Given the following context (JSON) and the user's message, reply helpfully. Context:\n${JSON.stringify(context)}\nUser message:\n${userMessage}\nRespond with a JSON object: { "reply": "..." } and nothing else.`

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
