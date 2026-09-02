"use client"
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { carSchema, CarInput } from '../../../lib/validators/car'
import { maintenanceSchema, MaintenanceInput } from '../../../lib/validators/maintenance'

export default function CarDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const [car, setCar] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ make: '', model: '', year: '', plate_license: '', mileage: '', last_service_date: '', test_expiry_date: '', insurance_expiry_date: '' })
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [records, setRecords] = useState<any[]>([])
  const [recordForm, setRecordForm] = useState({ id: '', type: '', date: '', name_garage: '', cost: '', notes: '' })
  const [recordLoading, setRecordLoading] = useState(false)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [recordErrors, setRecordErrors] = useState<string[]>([])
  const [isEditing, setIsEditing] = useState(false)

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
          mileage: String(data.mileage || ''),
          last_service_date: data.last_service_date || '',
          test_expiry_date: data.test_expiry_date || '',
          insurance_expiry_date: data.insurance_expiry_date || ''
        })
        // load maintenance records for this car
        const { data: recs, error: recErr } = await supabase.from('maintenance_records').select('*').eq('car_id', id).order('date', { ascending: false })
        if (recErr) console.error(recErr)
        else setRecords(recs || [])
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
        last_service_date: form.last_service_date || null,
        test_expiry_date: form.test_expiry_date || null,
        insurance_expiry_date: form.insurance_expiry_date || null,
      }).eq('id', id)

      if (error) throw error
      // switch back to view mode and refresh
      setIsEditing(false)
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

  const handleRecordChange = (k: string, v: string) => setRecordForm(prev => ({ ...prev, [k]: v }))

  const onSaveRecord = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setRecordLoading(true)
    setRecordErrors([])
    try {
      // Validate input with Zod
      const parsed = maintenanceSchema.parse({
        type: recordForm.type,
        date: recordForm.date,
        name_garage: recordForm.name_garage,
        cost: recordForm.cost,
        notes: recordForm.notes,
      } as MaintenanceInput)

      const payload = {
        car_id: id,
        type: parsed.type,
        date: parsed.date,
        name_garage: parsed.name_garage || null,
        cost: parsed.cost,
        notes: parsed.notes || null
      }

      if (editingRecordId) {
        const { error } = await supabase.from('maintenance_records').update(payload).eq('id', editingRecordId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('maintenance_records').insert(payload)
        if (error) throw error
      }

      // reload records
      const { data: recs, error: recErr } = await supabase.from('maintenance_records').select('*').eq('car_id', id).order('date', { ascending: false })
      if (recErr) throw recErr
      setRecords(recs || [])
      setRecordForm({ id: '', type: '', date: '', name_garage: '', cost: '', notes: '' })
      setEditingRecordId(null)
    } catch (err: any) {
      console.error(err)
      if (err?.errors && Array.isArray(err.errors)) {
        const messages = err.errors.map((e: any) => e.message || String(e))
        setRecordErrors(messages)
      } else {
        setRecordErrors([err.message || String(err)])
      }
    } finally {
      setRecordLoading(false)
    }
  }

  const onEditRecord = (rec: any) => {
    setEditingRecordId(rec.id)
    setRecordForm({ id: rec.id, type: rec.type || '', date: rec.date || '', name_garage: rec.name_garage || '', cost: String(rec.cost || ''), notes: rec.notes || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onDeleteRecord = async (recId: string) => {
    if (!confirm('Delete this maintenance record?')) return
    const { error } = await supabase.from('maintenance_records').delete().eq('id', recId)
    if (error) return setErrors({ record: error.message })
    setRecords(prev => prev.filter(r => r.id !== recId))
  }

  if (loading) return <div className="p-4">Loading...</div>
  if (!car) return <div className="p-4">Car not found</div>

  return (
    <main className="min-h-screen flex flex-col">
      <div className="p-4">
        <h2 className="text-lg font-semibold">{isEditing ? 'Edit Car' : 'Car details'}</h2>
      </div>

      {/* View mode */}
      {!isEditing && (
        <div className="p-4 max-w-lg">
          <div className="mb-2"><strong>Make:</strong> {car.make}</div>
          <div className="mb-2"><strong>Model:</strong> {car.model}</div>
          <div className="mb-2"><strong>Year:</strong> {car.year}</div>
          <div className="mb-2"><strong>Plate:</strong> {car.plate_license}</div>
          <div className="mb-2"><strong>Mileage:</strong> {car.mileage}</div>
          <div className="mb-2"><strong>Last service date:</strong> {car.last_service_date || '-'}</div>
          <div className="mb-2"><strong>Test expiry date:</strong> {car.test_expiry_date || '-'}</div>
          <div className="mb-2"><strong>Insurance expiry date:</strong> {car.insurance_expiry_date || '-'}</div>
          <div className="flex items-center gap-3 mt-4">
            <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-sky-600 text-white rounded">Edit</button>
            <button type="button" onClick={markSold} className="px-4 py-2 bg-red-600 text-white rounded">Mark as sold</button>
          </div>
        </div>
      )}

      {/* Edit mode */}
      {isEditing && (
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

          <label className="block mb-2">Last service date
            <input type="date" value={form.last_service_date} onChange={e => handleChange('last_service_date', e.target.value)} className="w-full mt-1 p-2 border rounded" />
          </label>

          <label className="block mb-2">Test (vehicle inspection) expiry date
            <input type="date" value={form.test_expiry_date} onChange={e => handleChange('test_expiry_date', e.target.value)} className="w-full mt-1 p-2 border rounded" />
          </label>

          <label className="block mb-2">Insurance expiry date
            <input type="date" value={form.insurance_expiry_date} onChange={e => handleChange('insurance_expiry_date', e.target.value)} className="w-full mt-1 p-2 border rounded" />
          </label>

          <div className="flex items-center gap-3 mt-4">
            <button className="px-4 py-2 bg-sky-600 text-white rounded">Save</button>
            <button type="button" onClick={() => { setIsEditing(false); setForm({ make: car.make || '', model: car.model || '', year: String(car.year || ''), plate_license: car.plate_license || '', mileage: String(car.mileage || ''), last_service_date: car.last_service_date || '', test_expiry_date: car.test_expiry_date || '', insurance_expiry_date: car.insurance_expiry_date || '' }) }} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
            <button type="button" onClick={markSold} className="px-4 py-2 bg-red-600 text-white rounded">Mark as sold</button>
          </div>
        </form>
      )}

      <section className="p-4 max-w-lg">
        <h3 className="text-md font-semibold mt-6">Maintenance Records</h3>
        {recordErrors.length > 0 && (
          <div className="text-red-600 mb-2">
            {recordErrors.map((m, i) => (
              <div key={i}>{m}</div>
            ))}
          </div>
        )}

        <form onSubmit={onSaveRecord} className="mt-3 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Type (oil, tyre...)" value={recordForm.type} onChange={e => handleRecordChange('type', e.target.value)} className="p-2 border rounded" />
            <input type="date" value={recordForm.date} onChange={e => handleRecordChange('date', e.target.value)} className="p-2 border rounded" />
            <input placeholder="Garage name" value={recordForm.name_garage} onChange={e => handleRecordChange('name_garage', e.target.value)} className="p-2 border rounded" />
            <input placeholder="Cost" value={recordForm.cost} onChange={e => handleRecordChange('cost', e.target.value)} className="p-2 border rounded" />
            <textarea placeholder="Notes" value={recordForm.notes} onChange={e => handleRecordChange('notes', e.target.value)} className="col-span-2 p-2 border rounded" />
          </div>
          <div className="mt-2">
            <button className="px-3 py-1 bg-green-600 text-white rounded" disabled={recordLoading}>{editingRecordId ? 'Update Record' : 'Add Record'}</button>
            {editingRecordId && <button type="button" onClick={() => { setEditingRecordId(null); setRecordForm({ id: '', type: '', date: '', name_garage: '', cost: '', notes: '' }) }} className="ml-2 px-3 py-1 bg-gray-300 rounded">Cancel</button>}
          </div>
        </form>

        <div className="space-y-3">
          {records.map(r => (
            <div key={r.id} className="p-3 border rounded">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{r.type} — {r.name_garage}</div>
                  <div className="text-sm text-slate-600">{r.date}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onEditRecord(r)} className="px-2 py-1 bg-yellow-400 rounded">Edit</button>
                  <button onClick={() => onDeleteRecord(r.id)} className="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
                </div>
              </div>
              {r.notes && <div className="mt-2 text-sm">{r.notes}</div>}
            </div>
          ))}
          {records.length === 0 && <div className="text-sm text-slate-600">No maintenance records yet.</div>}
        </div>
      </section>
    </main>
  )
}
