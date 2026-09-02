"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { carSchema, CarInput } from '../../../lib/validators/car'

export default function NewCarPage() {
  const router = useRouter()
  const [form, setForm] = useState({ make: '', model: '', year: '', plate_license: '', mileage: '' })
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(false)

  const handleChange = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      const parsed = carSchema.parse({
        make: form.make,
        model: form.model,
        year: Number(form.year),
        plate_license: form.plate_license,
        mileage: Number(form.mileage),
      } as CarInput)

      const { data, error } = await supabase.from('cars').insert({
        make: parsed.make,
        model: parsed.model,
        year: parsed.year,
        plate_license: parsed.plate_license,
        mileage: parsed.mileage,
        status: 'active'
      }).select().single()

      if (error) throw error
      router.push(`/cars/${data.id}`)
    } catch (err: any) {
      if (err.errors) {
        const zodErrors: Record<string,string> = {}
        for (const e of err.errors) {
          if (e.path && e.path[0]) zodErrors[String(e.path[0])] = e.message
        }
        setErrors(zodErrors)
      } else {
        setErrors({ form: err.message || String(err) })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="p-4">
        <h2 className="text-lg font-semibold">Add New Car</h2>
      </div>
      <form onSubmit={onSubmit} className="p-4 max-w-lg">
        {errors.form && <div className="text-red-600 mb-2">{errors.form}</div>}
        <label className="block mb-2">Make
          <input value={form.make} onChange={e => handleChange('make', e.target.value)} className="w-full mt-1 p-2 border rounded" />
          {errors.make && <div className="text-sm text-red-600">{errors.make}</div>}
        </label>

        <label className="block mb-2">Model
          <input value={form.model} onChange={e => handleChange('model', e.target.value)} className="w-full mt-1 p-2 border rounded" />
          {errors.model && <div className="text-sm text-red-600">{errors.model}</div>}
        </label>

        <label className="block mb-2">Year
          <input value={form.year} onChange={e => handleChange('year', e.target.value)} className="w-full mt-1 p-2 border rounded" />
          {errors.year && <div className="text-sm text-red-600">{errors.year}</div>}
        </label>

        <label className="block mb-2">Plate license
          <input value={form.plate_license} onChange={e => handleChange('plate_license', e.target.value)} className="w-full mt-1 p-2 border rounded" />
          {errors.plate_license && <div className="text-sm text-red-600">{errors.plate_license}</div>}
        </label>

        <label className="block mb-2">Mileage
          <input value={form.mileage} onChange={e => handleChange('mileage', e.target.value)} className="w-full mt-1 p-2 border rounded" />
          {errors.mileage && <div className="text-sm text-red-600">{errors.mileage}</div>}
        </label>

        <div className="mt-4">
          <button className="px-4 py-2 bg-sky-600 text-white rounded" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </main>
  )
}
