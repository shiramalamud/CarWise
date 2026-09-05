"use client"
import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { Button, Input, Label, Select, useToast } from '../../../../../components/ui'
import NavBar from '../../../../../components/NavBar'
import { ArrowLeft, CarFront } from 'lucide-react'

const DOCUMENT_TYPES = [
  'License',
  'ID',
  'Additional Driver ID',
  'Car Insurance',
  'Comprehensive Insurance',
  'Mandatory Insurance',
  'Other',
]

export default function NewDocumentPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const toast = useToast()

  const [docType, setDocType] = useState(DOCUMENT_TYPES[0])
  const [customType, setCustomType] = useState('')
  const [expiry, setExpiry] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const backToCar = () => router.push(`/cars/${id}?tab=documents`)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const resolvedType = docType === 'Other' ? customType.trim() : docType
    if (docType === 'Other' && !resolvedType) {
      setError('Please enter a custom document type')
      return
    }
    if (!file) {
      setError('Select a file before uploading')
      return
    }

    setUploading(true)
    try {
      const bucket = 'car-documents'
      // sanitize filename: use timestamp + UUID + original extension only
      const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/)
      const ext = extMatch ? extMatch[1] : ''
      const uid = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2)
      const filename = `${Date.now()}_${uid}${ext ? `.${ext}` : ''}`
      const path = `${id}/${filename}`

      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false })
      if (upErr) throw upErr

      const { error: insErr } = await supabase.from('car_documents').insert({
        car_id: id,
        document_type: resolvedType,
        expiry_date: expiry || null,
        file_url: path,
      })
      if (insErr) throw insErr

      toast.push({ type: 'success', title: 'Document uploaded' })
      backToCar()
    } catch (err: any) {
      console.error('Upload error', err)
      setError(err.message || String(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col relative bg-white">
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-teal-950 via-teal-900 to-teal-900/0 pointer-events-none overflow-hidden">
        <CarFront className="absolute -right-10 -top-6 text-white/5" size={260} strokeWidth={1} />
      </div>

      <div className="relative z-10">
        <NavBar dark />
        <div className="px-4 pb-6">
          <button
            type="button"
            onClick={backToCar}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft size={16} /> Back to car
          </button>
          <h2 className="font-display text-3xl font-bold text-white">Add Document</h2>
        </div>
      </div>

      <div className="relative z-10 px-4 -mt-2 max-w-lg pb-24">
        <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-lg p-6">
          {error && <div className="text-red-600 mb-3 text-sm">{error}</div>}

          <Label>Document type</Label>
          <Select value={docType} onChange={e => setDocType(e.target.value)}>
            {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>

          {docType === 'Other' && (
            <>
              <Label className="mt-3">Custom label</Label>
              <Input value={customType} onChange={e => setCustomType(e.target.value)} placeholder="Describe the document" />
            </>
          )}

          <Label className="mt-3">Expiry date <span className="text-xs text-slate-400">(optional)</span></Label>
          <Input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} />

          <Label className="mt-3">File</Label>
          <Input type="file" onChange={e => setFile((e.target as HTMLInputElement).files?.[0] || null)} />

          <div className="mt-5 flex items-center gap-3">
            <Button variant="primary" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload Document'}</Button>
            <Button type="button" variant="ghost" onClick={backToCar}>Cancel</Button>
          </div>
        </form>
      </div>
    </main>
  )
}
