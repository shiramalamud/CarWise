"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import NavBar from '../../components/NavBar'
import { Badge, Button } from '../../components/ui'
import { supabase } from '../../lib/supabaseClient'
import { CarFront, Wrench, ShieldCheck, ClipboardCheck } from 'lucide-react'

// Unlike the home page's "Up Next" teaser (intentionally a 30-day-only summary),
// Calendar is the dedicated place to see every reminder regardless of how far out
// it is — so every set date is classified and shown, not just the next 30 days.
function classify(dateStr: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000*60*60*24))
  if (days < 0) return 'overdue'
  if (days <= 30) return 'due-soon'
  return 'upcoming'
}

const STATUS_LABEL: Record<string, string> = { overdue: 'Overdue', 'due-soon': 'Due soon', upcoming: 'Upcoming' }
const STATUS_COLOR: Record<string, 'red' | 'yellow' | 'gray'> = { overdue: 'red', 'due-soon': 'yellow', upcoming: 'gray' }

// Severity drives the accent — urgent items get a red border and warm tint,
// far-future ones are deliberately quieter so the eye goes to what matters now.
const STATUS_STYLE: Record<string, { border: string; card: string; iconBg: string; iconColor: string }> = {
  overdue: { border: 'border-l-4 border-red-500', card: 'bg-red-50', iconBg: 'bg-red-100', iconColor: 'text-red-600' },
  'due-soon': { border: 'border-l-4 border-amber-400', card: 'bg-white', iconBg: 'bg-teal-100', iconColor: 'text-teal-600' },
  upcoming: { border: 'border-l-4 border-slate-200', card: 'bg-white', iconBg: 'bg-slate-100', iconColor: 'text-slate-400' },
}

const TYPE_LABEL: Record<string, string> = { service: 'Service', test: 'Vehicle test', insurance: 'Insurance' }
const TYPE_ICON: Record<string, any> = { service: Wrench, test: ClipboardCheck, insurance: ShieldCheck }

export default function CalendarPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const { data: cars, error } = await supabase.from('cars').select('*').eq('status', 'active')
      if (error) {
        console.error(error)
        setLoading(false)
        return
      }

      const list: any[] = []
      for (const c of (cars || [])) {
        const serviceClass = classify(c.last_service_date)
        const testClass = classify(c.test_expiry_date)
        const insClass = classify(c.insurance_expiry_date)
        if (serviceClass) list.push({ car: c, type: 'service', date: c.last_service_date, status: serviceClass })
        if (testClass) list.push({ car: c, type: 'test', date: c.test_expiry_date, status: testClass })
        if (insClass) list.push({ car: c, type: 'insurance', date: c.insurance_expiry_date, status: insClass })
      }

      list.sort((a,b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
      if (mounted) setItems(list)
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <main className="min-h-screen flex flex-col relative bg-white">
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-teal-950 via-teal-900 to-teal-900/0 pointer-events-none overflow-hidden">
        <CarFront className="absolute -right-10 -top-6 text-white/5" size={260} strokeWidth={1} />
      </div>

      <div className="relative z-10">
        <NavBar dark />
      </div>

      <div className="relative z-10 flex-1 px-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-white mb-6">Calendar — Reminders</h2>

          {loading && <div className="text-sm text-slate-200">Loading…</div>}
          {!loading && items.length === 0 && (
            <div className="rounded-2xl bg-white shadow-md p-8 text-center text-slate-500">
              No upcoming or overdue reminders.
            </div>
          )}
          <div className="space-y-4">
            {items.map((it, i) => {
              const style = STATUS_STYLE[it.status]
              const Icon = TYPE_ICON[it.type] || CarFront
              const quiet = it.status === 'upcoming'
              return (
                <div
                  key={it.type + it.car.id + it.date}
                  className={`flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 ${style.border} ${style.card} transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-fade-in-up`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${style.iconBg}`}>
                      <Icon size={20} className={style.iconColor} />
                    </div>
                    <div className="min-w-0">
                      <div className={`font-semibold truncate ${quiet ? 'text-slate-500' : 'text-slate-900'}`}>
                        {it.car.make} {it.car.model} — {TYPE_LABEL[it.type] || it.type}
                      </div>
                      <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                        <span className={quiet ? 'text-slate-400' : ''}>{it.date}</span>
                        <Badge color={STATUS_COLOR[it.status]}>{STATUS_LABEL[it.status]}</Badge>
                      </div>
                    </div>
                  </div>
                  <Link href={`/cars/${it.car.id}`} className="shrink-0 no-underline">
                    <Button variant="outline" className="text-sm">Open car</Button>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}
