"use client"
import React from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Button } from './ui'
import { LogOut, CarFront } from 'lucide-react'

export default function NavBar({ dark = false }: { dark?: boolean }) {
  const router = useRouter()
  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }
  return (
    <nav className={`w-full p-4 flex items-center justify-between ${dark ? 'bg-transparent' : 'bg-slate-50'}`}>
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-sm">
          <CarFront size={20} />
        </div>
        <span className={`font-display font-bold text-xl tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>CarWise</span>
      </div>
      <div>
        <Button
          variant="ghost"
          onClick={logout}
          className={dark ? '!bg-white/10 !text-white !border-white/20 hover:!bg-white/20 flex items-center gap-2' : 'flex items-center gap-2'}
        >
          <LogOut size={16}/> Log out
        </Button>
      </div>
    </nav>
  )
}
