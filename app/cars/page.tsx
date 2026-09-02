"use client"
import React, { useEffect, useState } from 'react'
import NavBar from '../../components/NavBar'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

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
    <main className="min-h-screen flex flex-col">
      <NavBar />
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">My Cars</h2>
          <Link href="/cars/new" className="text-sm text-sky-600">Add car</Link>
        </div>

        {loading && <div>Loading...</div>}
        {!loading && cars.length === 0 && <div>No active cars found.</div>}

        <div className="grid gap-3">
          {cars.map(car => (
            <Link key={car.id} href={`/cars/${car.id}`} className="block p-4 bg-white rounded shadow">
              <div className="font-medium">{car.make} {car.model} ({car.year})</div>
              <div className="text-sm text-gray-600">Plate: {car.plate_license} — Mileage: {car.mileage}</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
