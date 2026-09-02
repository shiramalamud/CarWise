"use client"
import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import BottomNavBar from './BottomNavBar'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isPublic, setIsPublic] = useState(false)

  useEffect(() => {
    const check = async () => {
      const publicPaths = ['/login', '/signup', '/_next', '/api']
      if (publicPaths.some(p => pathname?.startsWith(p))) {
        setIsPublic(true)
        setLoading(false)
        return
      }

      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/login')
      } else {
        setLoading(false)
      }
    }
    check()
  }, [pathname, router])

  if (loading) return <div />
  if (isPublic) return <>{children}</>
  return (
    <>
      {children}
      <BottomNavBar />
    </>
  )
}
