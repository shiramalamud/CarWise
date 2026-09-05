"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { carSchema, CarInput } from '../../../lib/validators/car'
import NavBar from '../../../components/NavBar'
import { CarFront } from 'lucide-react'

export default function NewCarPage() {
  const router = useRouter()
  const [form, setForm] = useState({ make: '', model: '', year: '', plate_license: '', mileage: '', last_service_date: '', test_expiry_date: '', insurance_expiry_date: '' })
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

      // Ensure we have the current user's family_id from profiles
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) throw new Error('Not authenticated')

      const { data: profileData, error: profileErr } = await supabase.from('profiles').select('family_id').eq('id', userId).single()
      if (profileErr) throw profileErr
      const familyId = profileData?.family_id

      // Log family_id being sent to help debug RLS errors (visible in browser console)
      console.log('creating car with family_id:', familyId)

      const { data, error } = await supabase.from('cars').insert({
        id_family: familyId,
        make: parsed.make,
        model: parsed.model,
        year: parsed.year,
        plate_license: parsed.plate_license,
        mileage: parsed.mileage,
        last_service_date: form.last_service_date || null,
        test_expiry_date: form.test_expiry_date || null,
        insurance_expiry_date: form.insurance_expiry_date || null,
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
    <main className="min-h-screen flex flex-col relative bg-white">
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-teal-950 via-teal-900 to-teal-900/0 pointer-events-none overflow-hidden">
        <CarFront className="absolute -right-10 -top-6 text-white/5" size={260} strokeWidth={1} />
      </div>

      <div className="relative z-10">
        <NavBar dark />
        <div className="px-4 pb-6">
          <h2 className="font-display text-3xl font-bold text-white">Add New Car</h2>
        </div>
      </div>

      <div className="relative z-10 px-4 -mt-2 max-w-lg pb-24">
        <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-lg p-6">
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

          <label className="block mb-2">Last service date <span className="text-xs text-slate-400">(optional)</span>
            <input type="date" value={form.last_service_date} onChange={e => handleChange('last_service_date', e.target.value)} className="w-full mt-1 p-2 border rounded" />
          </label>

          <label className="block mb-2">Test (vehicle inspection) expiry date <span className="text-xs text-slate-400">(optional)</span>
            <input type="date" value={form.test_expiry_date} onChange={e => handleChange('test_expiry_date', e.target.value)} className="w-full mt-1 p-2 border rounded" />
          </label>

          <label className="block mb-2">Insurance expiry date <span className="text-xs text-slate-400">(optional)</span>
            <input type="date" value={form.insurance_expiry_date} onChange={e => handleChange('insurance_expiry_date', e.target.value)} className="w-full mt-1 p-2 border rounded" />
          </label>

          <div className="mt-4">
            <button className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded transition-colors" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </main>
  )
}
