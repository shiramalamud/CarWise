"use client"
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { carSchema, CarInput } from '../../../lib/validators/car'

export default function CarDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const [car, setCar] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ make: '', model: '', year: '', plate_license: '', mileage: '' })
  const [errors, setErrors] = useState<Record<string,string>>({})

  useEffect(() => {
    if (!id) return
    let mounted = true
    const load = async () => {
      const { data, error } = await supabase.from('cars').select('*').eq('id', id).single()
      if (error) console.error(error)
      else if (mounted && data) {
        setCar(data)
        setForm({
          make: data.make || '',
          model: data.model || '',
          year: String(data.year || ''),
          plate_license: data.plate_license || '',
          mileage: String(data.mileage || '')
        })
      }
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [id])

  const handleChange = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    try {
      const parsed = carSchema.parse({
        make: form.make,
        model: form.model,
        year: Number(form.year),
        plate_license: form.plate_license,
        mileage: Number(form.mileage),
      } as CarInput)

      const { error } = await supabase.from('cars').update({
        make: parsed.make,
        model: parsed.model,
        year: parsed.year,
        plate_license: parsed.plate_license,
        mileage: parsed.mileage,
      }).eq('id', id)

      if (error) throw error
      router.refresh()
    } catch (err: any) {
      if (err.errors) {
        const zodErrors: Record<string,string> = {}
        for (const e of err.errors) {
          if (e.path && e.path[0]) zodErrors[String(e.path[0])] = e.message
        }
        setErrors(zodErrors)
      } else setErrors({ form: err.message || String(err) })
    }
  }

  const markSold = async () => {
    await supabase.from('cars').update({ status: 'sold' }).eq('id', id)
    router.push('/cars')
  }

  if (loading) return <div className="p-4">Loading...</div>
  if (!car) return <div className="p-4">Car not found</div>

  return (
    <main className="min-h-screen flex flex-col">
      <div className="p-4">
        <h2 className="text-lg font-semibold">Edit Car</h2>
      </div>
      <form onSubmit={onSave} className="p-4 max-w-lg">
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

        <div className="flex items-center gap-3 mt-4">
          <button className="px-4 py-2 bg-sky-600 text-white rounded">Save</button>
          <button type="button" onClick={markSold} className="px-4 py-2 bg-red-600 text-white rounded">Mark as sold</button>
        </div>
      </form>
    </main>
  )
}
