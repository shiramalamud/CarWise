"use client"
import React, { useEffect, useState } from 'react'
import NavBar from '../../components/NavBar'
import { Button } from '../../components/ui'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import { CarFront } from 'lucide-react'

type Car = {
  id: string
  make?: string
  model?: string
  year?: number
  plate_license?: string
  mileage?: number
  status?: string
}

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('status', 'active')
        .order('at_created', { ascending: false })

      if (error) {
        console.error(error)
      } else if (mounted) {
        setCars(data || [])
      }
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-3xl font-bold text-white">My Cars</h2>
            <Link href="/cars/new" className="no-underline"><Button variant="primary">+ Add car</Button></Link>
          </div>

          {loading && <div className="text-slate-500 text-sm">Loading…</div>}
          {!loading && cars.length === 0 && (
            <div className="rounded-2xl bg-white shadow-md p-8 text-center text-slate-500">
              No active cars yet. Add your first car to get started.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {cars.map((car, i) => (
              <Link key={car.id} href={`/cars/${car.id}`} className="block no-underline group">
                <div
                  className="rounded-2xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 border border-slate-100 animate-fade-in-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="h-2 bg-gradient-to-r from-teal-500 to-emerald-600" />
                  <div className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-teal-800 to-teal-950 text-emerald-300 flex items-center justify-center">
                      <CarFront size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-lg font-bold text-slate-900 truncate">{car.make} {car.model}</div>
                      <div className="text-xs text-slate-400">{car.year}</div>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1">{car.plate_license}</span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1">{(car.mileage ?? 0).toLocaleString()} km</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
