"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import NavBar from '../components/NavBar'
import Splash from '../components/Splash'
import { Card, Badge } from '../components/ui'
import { supabase } from '../lib/supabaseClient'
import { computeCarHealth, DateStatus } from '../lib/carHealth'
import { Car, Calendar, MessageCircle, CarFront, Copy, Check, Gauge, Wrench, ClipboardCheck, ShieldCheck } from 'lucide-react'

type CheckType = 'test' | 'insurance' | 'service'
type FleetItem = { car: any; type: CheckType; status: DateStatus; days: number | null }

const TYPE_LABEL: Record<CheckType, string> = { service: 'Service', test: 'Vehicle test', insurance: 'Insurance' }
const TYPE_ICON: Record<CheckType, any> = { service: Wrench, test: ClipboardCheck, insurance: ShieldCheck }

// Lower rank sorts first — expired/overdue items outrank due-soon, which
// outrank missing data (there's no date to act on urgently there).
function urgencyRank(item: FleetItem) {
  if (item.status === 'expired') return 0
  if (item.status === 'overdue') return 1
  if (item.status === 'due-soon') return 2
  return 3 // missing
}

// Within a rank, sort so the most pressing item comes first: most-negative
// days for expired/due-soon, most days-ago for a service that's overdue.
function urgencyValue(item: FleetItem) {
  if (item.status === 'overdue') return -(item.days ?? 0)
  return item.days ?? 0
}

function describeAttentionItem(item: FleetItem) {
  const carLabel = `${item.car.make} ${item.car.model}`
  const typeLabel = TYPE_LABEL[item.type]
  const Icon = TYPE_ICON[item.type]
  const base = { label: `${carLabel} — ${typeLabel}`, Icon }
  const plural = (n: number) => (n === 1 ? '' : 's')

  if (item.status === 'missing') {
    return { ...base, sub: 'Not recorded', badgeColor: 'yellow' as const, badgeText: 'Missing', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' }
  }
  if (item.status === 'expired') {
    const days = Math.abs(item.days ?? 0)
    return { ...base, sub: `Expired ${days} day${plural(days)} ago`, badgeColor: 'red' as const, badgeText: 'Overdue', iconBg: 'bg-red-100', iconColor: 'text-red-600' }
  }
  if (item.status === 'overdue') {
    const days = item.days ?? 0
    return { ...base, sub: `Last done ${days} day${plural(days)} ago`, badgeColor: 'red' as const, badgeText: 'Overdue', iconBg: 'bg-red-100', iconColor: 'text-red-600' }
  }
  const days = item.days ?? 0
  return { ...base, sub: `Due in ${days} day${plural(days)}`, badgeColor: 'yellow' as const, badgeText: 'Due soon', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' }
}

const FLEET_LEVEL_STYLE = {
  excellent: { label: 'Excellent', ring: '#0d9488', ringSoft: '#ccfbf1', text: 'text-teal-700' },
  good: { label: 'Good', ring: '#059669', ringSoft: '#d1fae5', text: 'text-emerald-700' },
  attention: { label: 'Needs attention', ring: '#d97706', ringSoft: '#fef3c7', text: 'text-amber-700' },
  action: { label: 'Action needed', ring: '#dc2626', ringSoft: '#fee2e2', text: 'text-red-700' },
} as const
type FleetLevel = keyof typeof FLEET_LEVEL_STYLE

function levelForScore(score: number): FleetLevel {
  if (score >= 90) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 40) return 'attention'
  return 'action'
}

// Circular gauge that fills from 0 to the real score on mount, so the number
// reads as something computed live rather than a static badge.
function HealthGauge({ score, level }: { score: number; level: FleetLevel }) {
  const style = FLEET_LEVEL_STYLE[level]
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 100)
    return () => clearTimeout(t)
  }, [score])

  const size = 128
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - animated / 100)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={style.ringSoft} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={style.ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-slate-900">{score}%</span>
      </div>
    </div>
  )
}

export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [carsCount, setCarsCount] = useState(0)
  const [dueCount, setDueCount] = useState(0)
  const [familyCode, setFamilyCode] = useState<string | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const [fleetLoading, setFleetLoading] = useState(true)
  const [fleetScore, setFleetScore] = useState(100)
  const [attentionItems, setAttentionItems] = useState<FleetItem[]>([])

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => { if (mounted) setAuthed(!!data.session) })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => { if (mounted) setAuthed(!!session) })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!authed) return
    let mounted = true
    const load = async () => {
      // load active cars
      const { data: cars, error } = await supabase.from('cars').select('*').eq('status', 'active')
      if (error) return console.error(error)
      if (!mounted) return
      setCarsCount((cars || []).length)

      // load the family's code, so it stays visible after signup (not just at creation time)
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (userId) {
        const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', userId).single()
        if (profile?.family_id) {
          const { data: family } = await supabase.from('families').select('code_family').eq('id', profile.family_id).single()
          if (mounted && family?.code_family) setFamilyCode(family.code_family)
        }
      }

      // 30-day-window due count, feeding the Calendar nav card's detail text only.
      const list: any[] = []
      const now = new Date()
      for (const c of (cars || [])) {
        const checks = [
          { type: 'service', date: c.last_service_date },
          { type: 'test', date: c.test_expiry_date },
          { type: 'insurance', date: c.insurance_expiry_date }
        ]
        for (const ch of checks) {
          if (!ch.date) continue
          const d = new Date(ch.date)
          const diff = d.getTime() - now.getTime()
          const days = Math.ceil(diff / (1000*60*60*24))
          if (days <= 30) list.push({ car: c, type: ch.type, date: ch.date, days })
        }
      }
      if (mounted) setDueCount(list.length)

      // Family fleet health score: aggregate the same per-car health checks used
      // on the car detail page (test/insurance expiry + service recency) across
      // every active car — percentage of checks currently in good standing.
      let totalChecks = 0
      let goodChecks = 0
      const items: FleetItem[] = []
      for (const c of (cars || [])) {
        const health = computeCarHealth(c)
        const checks: FleetItem[] = [
          { car: c, type: 'test', status: health.testStatus, days: health.testDays },
          { car: c, type: 'insurance', status: health.insStatus, days: health.insDays },
          { car: c, type: 'service', status: health.serviceStatus, days: health.serviceDaysAgo },
        ]
        for (const chk of checks) {
          totalChecks++
          if (chk.status === 'ok') goodChecks++
          else items.push(chk)
        }
      }
      items.sort((a, b) => urgencyRank(a) - urgencyRank(b) || urgencyValue(a) - urgencyValue(b))
      if (mounted) {
        setFleetScore(totalChecks > 0 ? Math.round((goodChecks / totalChecks) * 100) : 100)
        setAttentionItems(items)
        setFleetLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [authed])

  const handleCopyFamilyCode = async () => {
    if (!familyCode) return
    try {
      await navigator.clipboard.writeText(familyCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch {
      // clipboard API unavailable — the code is still visible to copy manually
    }
  }

  const fleetLevel = levelForScore(fleetScore)
  const fleetStyle = FLEET_LEVEL_STYLE[fleetLevel]

  const navCards = [
    {
      title: 'My Cars',
      href: '/cars',
      icon: <Car size={24} />,
      gradient: 'from-sky-500 to-blue-600',
      detail: `${carsCount} car${carsCount === 1 ? '' : 's'}`,
    },
    {
      title: 'Calendar',
      href: '/calendar',
      icon: <Calendar size={24} />,
      gradient: 'from-emerald-500 to-teal-600',
      detail: dueCount === 0 ? 'All caught up for now' : `${dueCount} item${dueCount === 1 ? '' : 's'} due soon`,
    },
    {
      title: 'Chat with AI',
      href: '/chat',
      icon: <MessageCircle size={24} />,
      gradient: 'from-violet-500 to-purple-600',
      detail: 'Ask your AI car assistant anything',
    },
  ]

  if (authed === null) return <div className="min-h-screen bg-teal-950" />
  if (!authed) return <Splash />

  return (
    <main className="min-h-screen flex flex-col relative bg-white">
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-teal-950 via-teal-900 to-teal-900/0 pointer-events-none overflow-hidden">
        <CarFront className="absolute -right-14 -top-8 text-white/5" size={340} strokeWidth={1} />
      </div>

      <div className="relative z-10">
        <NavBar dark />
      </div>

      <div className="relative z-10 flex-1 px-6 pb-24 space-y-6">
        <div className="max-w-4xl mx-auto">
          {familyCode && (
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={handleCopyFamilyCode}
                title="Copy family code"
                className="flex items-center gap-2 text-xs font-medium text-white/80 bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors"
              >
                Family code: <span className="font-mono tracking-wider text-white">{familyCode}</span>
                {codeCopied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          )}

          <Card className="rounded-2xl p-7 shadow-xl border border-slate-100 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-sm">
                <Gauge size={19} />
              </div>
              <h1 className="font-display text-3xl font-bold text-slate-900">Family Fleet Health</h1>
            </div>

            {fleetLoading ? (
              <div className="mt-6 text-sm text-slate-500">Crunching the numbers…</div>
            ) : carsCount === 0 ? (
              <div className="mt-5 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  <Car size={24} className="text-slate-300" />
                </div>
                <p className="text-sm text-slate-600">Add your first car to start tracking your family's fleet health.</p>
              </div>
            ) : (
              <div className="mt-5 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <HealthGauge score={fleetScore} level={fleetLevel} />
                <div className="flex-1 min-w-0 w-full text-center sm:text-left">
                  <div className={`text-lg font-bold ${fleetStyle.text}`}>Fleet Health: {fleetStyle.label}</div>

                  {attentionItems.length === 0 ? (
                    <p className="mt-1.5 text-sm text-slate-600">
                      All {carsCount} car{carsCount === 1 ? '' : 's'} {carsCount === 1 ? 'is' : 'are'} in great shape — nothing needs attention right now.
                    </p>
                  ) : (
                    <>
                      <p className="mt-1.5 text-sm text-slate-600">
                        {attentionItems.length} item{attentionItems.length === 1 ? '' : 's'} need attention across your fleet.
                      </p>
                      <div className="mt-3 space-y-2">
                        {attentionItems.slice(0, 2).map((item) => {
                          const d = describeAttentionItem(item)
                          return (
                            <div key={`${item.type}-${item.car.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-left">
                              <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${d.iconBg}`}>
                                <d.Icon size={16} className={d.iconColor} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-slate-900 truncate">{d.label}</div>
                                <div className="text-xs text-slate-500">{d.sub}</div>
                              </div>
                              <Badge color={d.badgeColor}>{d.badgeText}</Badge>
                            </div>
                          )
                        })}
                      </div>
                      {attentionItems.length > 2 && (
                        <Link href="/calendar" className="inline-block mt-3 text-sm font-semibold text-teal-700 hover:text-teal-800">
                          View all {attentionItems.length} in Calendar →
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </Card>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {navCards.map((c, i) => (
              <Link key={c.href} href={c.href} className="block no-underline">
                <Card
                  className="rounded-2xl p-6 shadow-md cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg animate-fade-in-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 shrink-0 rounded-full bg-gradient-to-br ${c.gradient} text-white flex items-center justify-center shadow-sm`}>
                      {c.icon}
                    </div>
                    <div>
                      <div className="font-display text-lg font-semibold">{c.title}</div>
                      <div className="text-sm text-slate-700 mt-2">{c.detail}</div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
