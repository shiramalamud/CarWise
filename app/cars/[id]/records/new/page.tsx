"use client"
import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { maintenanceSchema, MaintenanceInput } from '../../../../../lib/validators/maintenance'
import { Button, Input, Label, Select, useToast } from '../../../../../components/ui'
import NavBar from '../../../../../components/NavBar'
import { ArrowLeft, CarFront } from 'lucide-react'

const RECORD_TYPES = [
  'Oil Change',
  'Tire Pressure Check',
  'Tire Replacement',
  'Brake Service',
  'Battery Replacement',
  'Filter Replacement',
  'General Inspection',
  'Other',
]

export default function NewMaintenanceRecordPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const toast = useToast()

  const [type, setType] = useState(RECORD_TYPES[0])
  const [customType, setCustomType] = useState('')
  const [date, setDate] = useState('')
  const [garage, setGarage] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const backToCar = () => router.push(`/cars/${id}?tab=maintenance`)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])

    const resolvedType = type === 'Other' ? customType.trim() : type
    if (type === 'Other' && !resolvedType) {
      setErrors(['Please enter a custom type'])
      return
    }

    setLoading(true)
    try {
      const parsed = maintenanceSchema.parse({
        type: resolvedType,
        date,
        name_garage: garage,
        cost: Number(cost),
        notes,
      } as MaintenanceInput)

      const { error } = await supabase.from('maintenance_records').insert({
        car_id: id,
        type: parsed.type,
        date: parsed.date,
        name_garage: parsed.name_garage || null,
        cost: parsed.cost,
        notes: parsed.notes || null,
      })
      if (error) throw error

      toast.push({ type: 'success', title: 'Maintenance record added' })
      backToCar()
    } catch (err: any) {
      if (err?.errors && Array.isArray(err.errors)) {
        setErrors(err.errors.map((e: any) => e.message || String(e)))
      } else {
        setErrors([err.message || String(err)])
      }
    } finally {
      setLoading(false)
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
          <h2 className="font-display text-3xl font-bold text-white">Add Maintenance Record</h2>
        </div>
      </div>

      <div className="relative z-10 px-4 -mt-2 max-w-lg pb-24">
        <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-lg p-6">
          {errors.length > 0 && (
            <div className="text-red-600 mb-3 text-sm space-y-1">
              {errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}

          <Label>Type</Label>
          <Select value={type} onChange={e => setType(e.target.value)}>
            {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>

          {type === 'Other' && (
            <>
              <Label className="mt-3">Custom type</Label>
              <Input value={customType} onChange={e => setCustomType(e.target.value)} placeholder="Describe the service" />
            </>
          )}

          <Label className="mt-3">Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />

          <Label className="mt-3">Garage name</Label>
          <Input value={garage} onChange={e => setGarage(e.target.value)} placeholder="Optional" />

          <Label className="mt-3">Cost</Label>
          <Input value={cost} onChange={e => setCost(e.target.value)} placeholder="0" />

          <Label className="mt-3">Notes</Label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full mt-1 p-2 border rounded-md text-sm"
            rows={3}
            placeholder="Optional"
          />

          <div className="mt-5 flex items-center gap-3">
            <Button variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Add Record'}</Button>
            <Button type="button" variant="ghost" onClick={backToCar}>Cancel</Button>
          </div>
        </form>
      </div>
    </main>
  )
}
