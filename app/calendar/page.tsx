"use client"
import React, { useEffect, useState } from 'react'
import NavBar from '../../components/NavBar'
import { supabase } from '../../lib/supabaseClient'

function classify(dateStr: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000*60*60*24))
  if (days < 0) return 'overdue'
  if (days <= 30) return 'upcoming'
  return 'future'
}

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
        if (serviceClass === 'upcoming' || serviceClass === 'overdue') list.push({ car: c, type: 'service', date: c.last_service_date, status: serviceClass })
        if (testClass === 'upcoming' || testClass === 'overdue') list.push({ car: c, type: 'test', date: c.test_expiry_date, status: testClass })
        if (insClass === 'upcoming' || insClass === 'overdue') list.push({ car: c, type: 'insurance', date: c.insurance_expiry_date, status: insClass })
      }

      list.sort((a,b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
      if (mounted) setItems(list)
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="p-4">Loading...</div>

  return (
    <main className="min-h-screen flex flex-col">
      <NavBar />
      <div className="flex-1 p-8">
        <h2 className="text-lg font-semibold mb-3">Calendar — Reminders</h2>
        {items.length === 0 && <div className="text-sm text-slate-600">No upcoming or overdue reminders.</div>}
        <div className="space-y-3">
          {items.map(it => (
            <div key={it.type + it.car.id + it.date} className="p-3 border rounded flex justify-between items-center">
              <div>
                <div className="font-semibold">{it.car.make} {it.car.model} — {it.type}</div>
                <div className="text-sm text-slate-600">{it.date} — {it.status}</div>
              </div>
              <div>
                <a href={`/cars/${it.car.id}`} className="text-sky-600">Open car</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
