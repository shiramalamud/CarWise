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
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
      const publicPaths = ['/login', '/signup', '/_next', '/api']
      const onPublicPath = publicPaths.some(p => pathname?.startsWith(p))
      // '/' renders its own splash (logged-out) vs dashboard (logged-in) UI,
      // so it should never be force-redirected to /login
      const onSoftPath = pathname === '/'

      const check = async () => {
        if (onPublicPath) {
          setIsPublic(true)
          setLoading(false)
          return
        }

        setIsPublic(false)
        const { data } = await supabase.auth.getSession()
        const hasSession = !!data.session
        setAuthed(hasSession)
        if (!hasSession && !onSoftPath) {
          router.replace('/login')
          return
        }
        setLoading(false)
      }
      check()
      // listen for auth changes to update quickly, but never bounce a user
      // off a public/soft page (e.g. mid-signup, or the logged-out splash)
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setAuthed(!!session)
        if (!session && !onPublicPath && !onSoftPath) router.replace('/login')
      })
      return () => { sub.subscription.unsubscribe() }
    }, [pathname, router])

  if (loading) return <div />
  if (isPublic) return <>{children}</>
  return (
    <>
      {children}
      {authed && <BottomNavBar />}
    </>
  )
}
