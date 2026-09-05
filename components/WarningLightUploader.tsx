"use client"
import React, { useState } from 'react'
import { Badge } from './ui'

const URGENCY_COLOR: Record<string, 'green' | 'yellow' | 'red'> = {
  low: 'green',
  medium: 'yellow',
  high: 'red',
}

export default function WarningLightUploader({ carId }: { carId: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return setError('Please select an image')
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      if (carId) fd.append('carId', carId)

      const res = await fetch('/api/analyze-warning-light', { method: 'POST', body: fd })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Analysis failed')
      }
      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 p-4 border rounded max-w-lg">
      <h4 className="font-semibold mb-2">Analyze warning light</h4>
      <form onSubmit={onSubmit}>
        <input type="file" accept="image/*" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} />
        <div className="mt-2 flex gap-2">
          <button className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded transition-colors" disabled={loading}>{loading ? 'Analyzing...' : 'Upload & Analyze'}</button>
        </div>
      </form>

      {error && <div className="text-red-600 mt-2">{error}</div>}

      {result && (
        <div className="mt-3 p-3 bg-gray-50 rounded">
          <div className="flex items-center gap-2">
            <strong>Label:</strong> {result.label}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <strong>Urgency:</strong>
            <Badge color={URGENCY_COLOR[String(result.urgency).toLowerCase()] || 'yellow'}>
              {String(result.urgency).charAt(0).toUpperCase() + String(result.urgency).slice(1)}
            </Badge>
          </div>
          <div className="mt-2"><strong>Explanation:</strong><div className="mt-1">{result.explanation}</div></div>
        </div>
      )}
    </div>
  )
}
