import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('image') as Blob | null
    const carId = form.get('carId')?.toString() || null

    if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured. Set GEMINI_API_KEY.' }, { status: 501 })
    }

    // Build a prompt asking the model to analyze the image and return structured JSON
    const prompt = `You are given an image of a vehicle dashboard warning light. Analyze the image and respond with a JSON object with keys: label (short name of the light), urgency (low|medium|high), explanation (one or two short sentences telling the user what to do). Return ONLY valid JSON.`

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`

    // Build request body using the Gemini REST format: contents -> parts
    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: (file as any).type || 'image/jpeg', data: base64 } }
          ]
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
      return NextResponse.json({ error: 'Remote API error', details: txt }, { status: 502 })
    }

    const respJson = await resp.json()

    // Extract text output from Gemini response. Prefer the nested JSON in
    // candidates[0].content.parts[0].text when present, then fall back to
    // other shapes. Parse the inner JSON payload if possible.
    let textOutput: string | null = null
    try {
      if (respJson?.candidates && Array.isArray(respJson.candidates) && respJson.candidates.length > 0) {
        const cand = respJson.candidates[0]

        // Preferred shape: candidates[0].content.parts[0].text (the model's textual answer)
        if (cand?.content?.parts && Array.isArray(cand.content.parts) && cand.content.parts.length > 0) {
          const p0 = cand.content.parts[0]
          if (p0 && typeof p0.text === 'string' && p0.text.trim().length > 0) {
            textOutput = p0.text.trim()
          }
        }

        // Older/alternate shape: candidates[0].content is an array of content parts
        if (!textOutput && cand.content && Array.isArray(cand.content)) {
          const texts = cand.content
            .map((c: any) => (c && typeof c.text === 'string' ? c.text : null))
            .filter(Boolean)
          if (texts.length) textOutput = texts.join('\n')
        }

        // Fallback: candidates[0].output
        if (!textOutput && cand.output) textOutput = JSON.stringify(cand.output)
      }

      // Fallback: respJson.output[].content[].parts[].text
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
      // ignore parsing errors and fall through to fallback below
    }

    if (!textOutput) textOutput = JSON.stringify(respJson)

    // Gemini often wraps its JSON reply in a markdown code fence, e.g.
    // "```json\n{...}\n```" — strip that before parsing, or JSON.parse throws
    // and the raw fenced text used to end up dumped straight into the UI.
    const fenceMatch = textOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    const jsonCandidate = (fenceMatch ? fenceMatch[1] : textOutput).trim()

    let parsed: any = null
    try {
      parsed = JSON.parse(jsonCandidate)
    } catch (e) {
      parsed = null
    }

    const label = typeof parsed?.label === 'string' && parsed.label.trim()
      ? parsed.label.trim()
      : 'Unable to identify'
    const urgency = typeof parsed?.urgency === 'string' && parsed.urgency.trim()
      ? parsed.urgency.trim()
      : 'medium'
    const explanation = typeof parsed?.explanation === 'string' && parsed.explanation.trim()
      ? parsed.explanation.trim()
      : "We couldn't fully analyze this image. Please try again with a clearer photo of the warning light."

    return NextResponse.json({ label, urgency, explanation, carId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
