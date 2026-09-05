"use client"
import React, { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { carSchema, CarInput } from '../../../lib/validators/car'
import { maintenanceSchema, MaintenanceInput } from '../../../lib/validators/maintenance'
import WarningLightUploader from '../../../components/WarningLightUploader'
import { Button, Card, Input, Label, useToast, AlertDialog } from '../../../components/ui'
import NavBar from '../../../components/NavBar'
import { CarFront, Trash2, CheckCircle2, AlertTriangle, XCircle, ClipboardCheck, ShieldCheck, Wrench, Camera, FileText } from 'lucide-react'
import { DateStatus, computeCarHealth } from '../../../lib/carHealth'

const HEALTH_STYLE = {
  good: { icon: CheckCircle2, iconColor: 'text-emerald-600', textColor: 'text-emerald-800', label: 'All good' },
  attention: { icon: AlertTriangle, iconColor: 'text-amber-600', textColor: 'text-amber-800', label: 'Needs attention' },
  action: { icon: XCircle, iconColor: 'text-red-600', textColor: 'text-red-800', label: 'Action needed' },
} as const

// Nav-card-style stat tile: icon circle + bold title + the date/status as the
// most visually prominent element — color-coded by severity so a glance tells
// the whole story, not just another text row.
function StatTile({
  icon: Icon,
  title,
  value,
  status,
  daysInfo,
  onFix,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  value: string | null
  status: DateStatus
  daysInfo: number | null
  onFix: () => void
}) {
  const isExpired = status === 'expired'
  const isDueSoon = status === 'due-soon'
  const isOverdue = status === 'overdue'
  const isMissing = status === 'missing'
  const isWarnTier = isDueSoon || isOverdue

  const gradient = isExpired ? 'from-red-500 to-red-700' : (isWarnTier || isMissing) ? 'from-amber-400 to-amber-600' : 'from-teal-500 to-emerald-600'
  const tileStyle = isExpired ? 'bg-red-50 border-red-200' : (isWarnTier || isMissing) ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'
  const plural = (n: number) => (n === 1 ? '' : 's')

  return (
    <div className={`rounded-2xl border p-3 transition-shadow duration-200 hover:shadow-md ${tileStyle}`}>
      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-sm mb-3`}>
        <Icon size={20} />
      </div>
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">{title}</div>

      {isMissing ? (
        <button type="button" onClick={onFix} className="flex items-baseline gap-2 group">
          <span className="text-base font-bold text-amber-700 whitespace-nowrap">Not recorded</span>
          <span className="text-xs font-semibold text-amber-600 underline group-hover:text-amber-700">+ Add</span>
        </button>
      ) : (
        <>
          <div className={`text-base font-bold whitespace-nowrap ${isExpired ? 'text-red-700' : isWarnTier ? 'text-amber-700' : 'text-slate-900'}`}>
            {value}
          </div>
          {isExpired && daysInfo != null && (
            <div className="text-xs font-semibold text-red-600 mt-1">Expired {Math.abs(daysInfo)} day{plural(Math.abs(daysInfo))} ago</div>
          )}
          {isDueSoon && (
            <span className="inline-block mt-1.5 text-[11px] font-semibold bg-amber-400 text-slate-950 rounded-full px-2 py-0.5">Due soon</span>
          )}
          {isOverdue && (
            <div className="text-xs font-semibold text-amber-600 mt-1">Over a year ago</div>
          )}
        </>
      )}
    </div>
  )
}

// Shared header style for every card section (Maintenance Records, Car Documents,
// Analyze Warning Light) — a small tinted icon square + bold heading, so all three
// read as the same kind of thing rather than three separately-styled headings.
function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; subtitle: string }) {
  return (
    <>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
          <Icon size={16} />
        </div>
        <h4 className="font-display text-lg font-bold text-slate-900">{title}</h4>
      </div>
      <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
    </>
  )
}

// Underline tab button for the Car Management card — active tab gets the brand
// teal underline + tinted count pill, matching the icon/accent language used
// everywhere else on this page (StatTile, SectionHeader).
function TabButton({
  active,
  icon: Icon,
  label,
  count,
  onClick,
}: {
  active: boolean
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-0.5 pb-3 -mb-px border-b-2 text-sm font-semibold transition-colors ${
        active ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      <Icon size={16} />
      {label}
      {count > 0 && (
        <span className={`text-xs font-semibold rounded-full px-1.5 py-0.5 ${active ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

export default function CarDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const searchParams = useSearchParams()
  const [car, setCar] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ make: '', model: '', year: '', plate_license: '', mileage: '', last_service_date: '', test_expiry_date: '', insurance_expiry_date: '' })
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [records, setRecords] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [showWarningUploader, setShowWarningUploader] = useState(false)
  const [recordForm, setRecordForm] = useState({ id: '', type: '', date: '', name_garage: '', cost: '', notes: '' })
  const [recordLoading, setRecordLoading] = useState(false)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [recordErrors, setRecordErrors] = useState<string[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [showSoldDialog, setShowSoldDialog] = useState(false)
  const [soldLoading, setSoldLoading] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const [deleteRecordLoading, setDeleteRecordLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'maintenance' | 'documents'>('maintenance')
  const toast = useToast()

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
        // load documents
        const { data: docs, error: docsErr } = await supabase.from('car_documents').select('*').eq('car_id', id).order('at_uploaded', { ascending: false })
        if (docsErr) console.error(docsErr)
        else setDocuments(docs || [])
        // An explicit ?tab= from returning out of the dedicated add-record/
        // add-document screens always wins; otherwise default to whichever
        // tab already has content — Maintenance wins ties/empties.
        const requestedTab = searchParams?.get('tab')
        if (requestedTab === 'documents' || requestedTab === 'maintenance') {
          setActiveTab(requestedTab)
        } else if ((recs || []).length === 0 && (docs || []).length > 0) {
          setActiveTab('documents')
        }
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

      const updates = {
        make: parsed.make,
        model: parsed.model,
        year: parsed.year,
        plate_license: parsed.plate_license,
        mileage: parsed.mileage,
        last_service_date: form.last_service_date || null,
        test_expiry_date: form.test_expiry_date || null,
        insurance_expiry_date: form.insurance_expiry_date || null,
      }
      const { error } = await supabase.from('cars').update(updates).eq('id', id)

      if (error) throw error
      // Update local state directly — router.refresh() re-fetches server component
      // data, but this page's car data comes from a client-side useEffect, which
      // it doesn't re-trigger, so the view was showing stale pre-edit values.
      setCar((prev: any) => ({ ...prev, ...updates }))
      setIsEditing(false)
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
    setSoldLoading(true)
    // Soft delete only: UPDATE status, never DELETE the row (keeps maintenance history intact).
    const { error } = await supabase.from('cars').update({ status: 'sold' }).eq('id', id)
    setSoldLoading(false)
    setShowSoldDialog(false)
    if (error) {
      toast.push({ type: 'error', title: 'Could not mark as sold', message: error.message })
      return
    }
    toast.push({ type: 'success', title: 'Car marked as sold' })
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
        cost: Number(recordForm.cost),
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
    setShowRecordForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const health = car ? computeCarHealth(car) : null

  const requestDeleteRecord = (rec: any) => setRecordToDelete(rec.id)

  const onDeleteRecord = async () => {
    if (!recordToDelete) return
    const recId = recordToDelete
    setDeleteRecordLoading(true)
    const { error } = await supabase.from('maintenance_records').delete().eq('id', recId)
    setDeleteRecordLoading(false)
    setRecordToDelete(null)
    if (error) return toast.push({ type: 'error', title: 'Delete failed', message: error.message })
    setRecords(prev => prev.filter(r => r.id !== recId))
    toast.push({ type: 'success', title: 'Record deleted' })
  }

  return (
    <main className="min-h-screen flex flex-col relative bg-white">
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-teal-950 via-teal-900 to-teal-900/0 pointer-events-none overflow-hidden">
        <CarFront className="absolute -right-10 -top-6 text-white/5" size={280} strokeWidth={1} />
      </div>

      <div className="relative z-10">
        <NavBar dark />
        <div className="px-4 pb-6">
          <div className="flex items-center gap-3">
            {!loading && car && !isEditing && (
              <div className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-sm">
                <CarFront size={22} />
              </div>
            )}
            <h2 className="font-display text-3xl font-bold text-white">
              {loading ? 'Loading…' : !car ? 'Car not found' : isEditing ? 'Edit Car' : `${car.make} ${car.model}`}
            </h2>
          </div>
          {!loading && car && !isEditing && (
            <div className="mt-3 flex gap-2 flex-wrap">
              <span className="inline-flex items-center rounded-full bg-white/10 text-white text-xs font-medium px-2.5 py-1">{car.plate_license}</span>
              <span className="inline-flex items-center rounded-full bg-white/10 text-white text-xs font-medium px-2.5 py-1">{car.mileage?.toLocaleString()} km</span>
              <span className="inline-flex items-center rounded-full bg-white/10 text-white text-xs font-medium px-2.5 py-1">{car.year}</span>
            </div>
          )}
        </div>
      </div>

      {!loading && car && (
      <>
      <div className="relative z-10 px-4 max-w-6xl mx-auto -mt-2 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="flex flex-col">
      {/* View mode */}
      {!isEditing && (
            <Card className="rounded-2xl shadow-lg p-6 animate-fade-in-up">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm mb-5">
                <div><span className="text-slate-400">Make:</span> <span className="text-slate-700">{car.make}</span></div>
                <div><span className="text-slate-400">Model:</span> <span className="text-slate-700">{car.model}</span></div>
                <div><span className="text-slate-400">Year:</span> <span className="text-slate-700">{car.year}</span></div>
                <div><span className="text-slate-400">Plate:</span> <span className="text-slate-700">{car.plate_license}</span></div>
                <div><span className="text-slate-400">Mileage:</span> <span className="text-slate-700">{car.mileage?.toLocaleString()} km</span></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <StatTile
                  icon={ClipboardCheck}
                  title="Next Test"
                  value={car.test_expiry_date}
                  status={health!.testStatus}
                  daysInfo={health!.testDays}
                  onFix={() => setIsEditing(true)}
                />
                <StatTile
                  icon={ShieldCheck}
                  title="Insurance Renewal"
                  value={car.insurance_expiry_date}
                  status={health!.insStatus}
                  daysInfo={health!.insDays}
                  onFix={() => setIsEditing(true)}
                />
                <StatTile
                  icon={Wrench}
                  title="Last Service"
                  value={car.last_service_date}
                  status={health!.serviceStatus}
                  daysInfo={health!.serviceDaysAgo}
                  onFix={() => setIsEditing(true)}
                />
              </div>

              {health && (() => {
                const style = HEALTH_STYLE[health.level]
                const LevelIcon = style.icon
                return (
                  <div className="flex items-center gap-1.5 mt-4">
                    <LevelIcon size={15} className={`shrink-0 ${style.iconColor}`} />
                    <span className={`text-sm font-semibold ${style.textColor}`}>
                      {style.label}
                      {health.level === 'good' && (
                        <span className="font-normal text-slate-500"> — nothing needs attention right now.</span>
                      )}
                    </span>
                  </div>
                )
              })()}

              <div className="mt-5 pt-5 border-t border-slate-100 flex items-center gap-3">
                <Button variant="primary" onClick={() => setIsEditing(true)}>Edit</Button>
                <Button variant="danger" onClick={() => setShowSoldDialog(true)}>Mark as Sold</Button>
              </div>
            </Card>
      )}

      {/* Edit mode */}
      {isEditing && (
        <form onSubmit={onSave} className="bg-white rounded-2xl shadow-lg p-6 animate-fade-in-up">
          {errors.form && <div className="text-red-600 mb-2">{errors.form}</div>}
          <Label>Make</Label>
          <Input value={form.make} onChange={e => handleChange('make', e.target.value)} />
          {errors.make && <div className="text-sm text-red-600">{errors.make}</div>}

          <Label>Model</Label>
          <Input value={form.model} onChange={e => handleChange('model', e.target.value)} />
          {errors.model && <div className="text-sm text-red-600">{errors.model}</div>}

          <Label>Year</Label>
          <Input value={form.year} onChange={e => handleChange('year', e.target.value)} />
          {errors.year && <div className="text-sm text-red-600">{errors.year}</div>}

          <Label>Plate license</Label>
          <Input value={form.plate_license} onChange={e => handleChange('plate_license', e.target.value)} />
          {errors.plate_license && <div className="text-sm text-red-600">{errors.plate_license}</div>}

          <Label>Mileage</Label>
          <Input value={form.mileage} onChange={e => handleChange('mileage', e.target.value)} />
          {errors.mileage && <div className="text-sm text-red-600">{errors.mileage}</div>}

          <Label>Last service date</Label>
          <Input type="date" value={form.last_service_date} onChange={e => handleChange('last_service_date', e.target.value)} />

          <Label>Test (vehicle inspection) expiry date</Label>
          <Input type="date" value={form.test_expiry_date} onChange={e => handleChange('test_expiry_date', e.target.value)} />

          <Label>Insurance expiry date</Label>
          <Input type="date" value={form.insurance_expiry_date} onChange={e => handleChange('insurance_expiry_date', e.target.value)} />

          <div className="flex items-center gap-3 mt-4">
            <button className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded transition-colors">Save</button>
            <button type="button" onClick={() => { setIsEditing(false); setForm({ make: car.make || '', model: car.model || '', year: String(car.year || ''), plate_license: car.plate_license || '', mileage: String(car.mileage || ''), last_service_date: car.last_service_date || '', test_expiry_date: car.test_expiry_date || '', insurance_expiry_date: car.insurance_expiry_date || '' }) }} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
            <Button type="button" variant="danger" onClick={() => setShowSoldDialog(true)}>Mark as Sold</Button>
          </div>
        </form>
      )}
      </div>

      <div className="flex flex-col gap-6">
        {/* Standalone diagnostic tool — kept visually separate from the tracked
            records below (Maintenance/Documents are things you build up over time;
            this is a one-off check). */}
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100 p-6 animate-fade-in-up">
          <Camera className="absolute -right-6 -bottom-8 text-teal-50" size={140} strokeWidth={1} />
          <div className="relative">
            <SectionHeader icon={Camera} title="Analyze Warning Light" subtitle="Upload a photo of the dashboard warning light for AI analysis." />
            <div className="mt-4">
              <Button variant="primary" onClick={() => setShowWarningUploader(s => !s)}>{showWarningUploader ? 'Close' : 'Analyze Warning Light'}</Button>
            </div>
            {showWarningUploader && (
              <div className="mt-3">
                <WarningLightUploader carId={id} />
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 animate-fade-in-up">
        <div className="p-6 pb-0">
          <h3 className="font-display text-xl font-bold text-slate-900">Car Management</h3>
          <p className="text-sm text-slate-500 mt-1">Maintenance history and documents for this car.</p>

          <div className="flex gap-6 mt-5 border-b border-slate-100">
            <TabButton active={activeTab === 'maintenance'} icon={Wrench} label="Maintenance" count={records.length} onClick={() => setActiveTab('maintenance')} />
            <TabButton active={activeTab === 'documents'} icon={FileText} label="Documents" count={documents.length} onClick={() => setActiveTab('documents')} />
          </div>
        </div>

        {activeTab === 'maintenance' ? (
        <section className="p-6">
        {recordErrors.length > 0 && (
          <div className="text-red-600 mb-3">
            {recordErrors.map((m, i) => (
              <div key={i}>{m}</div>
            ))}
          </div>
        )}

        {!editingRecordId && (
          <div>
            <Button variant="primary" onClick={() => router.push(`/cars/${id}/records/new`)}>+ Add Maintenance Record</Button>
          </div>
        )}

        {(showRecordForm && editingRecordId) && (
          <form onSubmit={onSaveRecord} className="mb-4">
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Type (oil, tyre...)" value={recordForm.type} onChange={e => handleRecordChange('type', e.target.value)} className="p-2 border rounded" />
              <input type="date" value={recordForm.date} onChange={e => handleRecordChange('date', e.target.value)} className="p-2 border rounded" />
              <input placeholder="Garage name" value={recordForm.name_garage} onChange={e => handleRecordChange('name_garage', e.target.value)} className="p-2 border rounded" />
              <input placeholder="Cost" value={recordForm.cost} onChange={e => handleRecordChange('cost', e.target.value)} className="p-2 border rounded" />
              <textarea placeholder="Notes" value={recordForm.notes} onChange={e => handleRecordChange('notes', e.target.value)} className="col-span-2 p-2 border rounded" />
            </div>
            <div className="mt-2">
              <Button variant="primary" disabled={recordLoading}>{editingRecordId ? 'Update Record' : 'Add Record'}</Button>
              <Button variant="ghost" onClick={() => { setEditingRecordId(null); setRecordForm({ id: '', type: '', date: '', name_garage: '', cost: '', notes: '' }); setShowRecordForm(false) }} className="ml-2">Cancel</Button>
            </div>
          </form>
        )}

        <div className="mt-4 space-y-3">
          {records.map(r => (
            <div key={r.id} className="p-3 border rounded-lg transition-colors hover:bg-slate-50">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{r.type} — {r.name_garage}</div>
                  <div className="text-sm text-slate-600">{r.date}</div>
                </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => onEditRecord(r)} className="px-2 py-1">Edit</Button>
                        <Button variant="danger" onClick={() => requestDeleteRecord(r)} className="px-2 py-1">
                          <Trash2 size={14} /> Delete
                        </Button>
                      </div>
              </div>
              {r.notes && <div className="mt-2 text-sm">{r.notes}</div>}
            </div>
          ))}
          {records.length === 0 && <div className="text-sm text-slate-600">No maintenance records yet.</div>}
        </div>
        </section>
        ) : (
        <section className="p-6">
        <div>
          <Button variant="primary" onClick={() => router.push(`/cars/${id}/documents/new`)}>+ Add Document</Button>
        </div>

        <div className="mt-5">
          <h4 className="text-sm font-semibold text-slate-700">Uploaded documents</h4>
          <div className="space-y-3 mt-2">
            {documents.map(d => (
              <div key={d.id} className="p-3 border rounded-lg flex items-center justify-between transition-colors hover:bg-slate-50">
                <div>
                  <div className="font-semibold">{d.document_type}</div>
                  <div className="text-sm text-slate-600">Uploaded: {new Date(d.at_uploaded).toLocaleString()}</div>
                  {d.expiry_date && <div className="text-sm text-slate-600">Expiry: {d.expiry_date}</div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={async () => {
                    try {
                      const bucket = 'car-documents'
                      const path = d.file_url
                      const { data: urlData, error: urlErr } = await supabase.storage.from(bucket).createSignedUrl(path, 60)
                      if (urlErr) throw urlErr
                      const url = urlData.signedUrl
                      window.open(url, '_blank')
                    } catch (err: any) {
                      console.error('Download error', err)
                      alert('Download failed: ' + (err.message || String(err)))
                    }
                  }} className="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded transition-colors">Download</button>

                  <button onClick={async () => {
                    if (!confirm('Delete this document?')) return
                    try {
                      const bucket = 'car-documents'
                      const path = d.file_url
                      const { error: delErr } = await supabase.storage.from(bucket).remove([path])
                      if (delErr) throw delErr
                      const { error: dbErr } = await supabase.from('car_documents').delete().eq('id', d.id)
                      if (dbErr) throw dbErr
                      setDocuments(prev => prev.filter(x => x.id !== d.id))
                    } catch (err: any) {
                      console.error('Delete doc error', err)
                      alert('Delete failed: ' + (err.message || String(err)))
                    }
                  }} className="px-2 py-1 bg-red-600 text-white rounded">Delete</button>
                </div>
              </div>
            ))}
            {documents.length === 0 && <div className="text-sm text-slate-600">No documents uploaded.</div>}
          </div>
        </div>
        </section>
        )}
        </div>
      </div>
      </div>

      <AlertDialog
        open={showSoldDialog}
        title={`Mark ${car.make} ${car.model} as sold?`}
        description="It will be hidden from your active cars list but its maintenance history will be kept."
        confirmLabel="Mark as Sold"
        destructive
        loading={soldLoading}
        onConfirm={markSold}
        onCancel={() => setShowSoldDialog(false)}
      />

      <AlertDialog
        open={recordToDelete !== null}
        title="Delete this maintenance record?"
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteRecordLoading}
        onConfirm={onDeleteRecord}
        onCancel={() => setRecordToDelete(null)}
      />
      </>
      )}
    </main>
  )
}
