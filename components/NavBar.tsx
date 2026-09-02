"use client"
import React from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function NavBar() {
  const router = useRouter()
  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }
  return (
    <nav className="w-full p-4 bg-gray-50 flex justify-between">
      <div className="font-semibold">CarWise</div>
      <div>
        <button onClick={logout} className="text-sm text-sky-600">Log out</button>
      </div>
    </nav>
  )
}
