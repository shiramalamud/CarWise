"use client"
import React, { useState } from 'react'
import { Sora } from 'next/font/google'
import { ArrowRight, ArrowUpRight, Bell, Wrench, Users, Car } from 'lucide-react'
import { Button, Card, Modal } from './ui'
import LoginForm from './auth/LoginForm'
import SignupForm from './auth/SignupForm'

const sora = Sora({ subsets: ['latin'], weight: ['700', '800'] })

const FEATURES = [
  { title: 'Warning lights', desc: 'Decode the unknown', icon: Bell, iconBg: 'bg-teal-100', iconColor: 'text-teal-600' },
  { title: 'Maintenance', desc: 'Keep every due date close', icon: Wrench, iconBg: 'bg-orange-100', iconColor: 'text-orange-500' },
  { title: 'Family garage', desc: 'One view for every driver', icon: Users, iconBg: 'bg-teal-100', iconColor: 'text-teal-600' },
]

export default function Splash() {
  const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null)

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-teal-500/70">
      <section className="relative overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div>
            <div className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-700">THE FAMILY CAR COMPANION</div>
            <h1 className={`${sora.className} mt-5 text-7xl sm:text-8xl font-extrabold leading-[0.95] tracking-tight -ml-1`}>
              <span className="text-slate-900">Car</span>
              <span className="bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-transparent">Wise</span>
            </h1>
            <p className="mt-7 text-2xl font-bold text-slate-900">Your family&apos;s smart car assistant.</p>
            <p className="mt-2 text-lg font-normal text-slate-600 max-w-md">A calmer dashboard. A healthier car. Everyone in the loop.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button variant="teal" onClick={() => setAuthModal('login')}>
                Log in <ArrowRight size={16} />
              </Button>
              <Button variant="outline" onClick={() => setAuthModal('signup')}>
                Sign up
              </Button>
            </div>
          </div>

          {/* Right: floating dashboard preview */}
          <div className="relative flex justify-center md:justify-end">
            <div className="w-72 rounded-2xl bg-white shadow-2xl p-4 rotate-3 hover:rotate-1 transition-transform duration-300">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">My Garage</div>
                  <div className="text-xs text-slate-400 mt-0.5">Thu, Sep 4</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <Car size={16} />
                </div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-teal-700 to-teal-900 text-white p-4">
                <div className="text-sm font-semibold">Subaru Outback · 2021</div>
                <div className="text-xs text-teal-200 mt-0.5">Ready for the road.</div>
                <div className="mt-3 text-4xl font-bold leading-none">92</div>
                <div className="text-[11px] text-teal-200 mt-1">Health score</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-teal-50 text-teal-800 text-[11px] font-medium px-2.5 py-2 leading-snug">
                  Next service —<br /><span className="font-semibold">18 days</span>
                </div>
                <div className="rounded-lg bg-rose-50 text-rose-700 text-[11px] font-medium px-2.5 py-2 leading-snug">
                  Family status —<br /><span className="font-semibold">All clear</span>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-8 bg-white rounded-full shadow-lg px-3.5 py-2.5 flex items-center gap-2 -rotate-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs text-slate-700 whitespace-nowrap">
                <span className="font-semibold">Oil change logged</span>
                <span className="text-slate-400"> — by Alex · just now</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-28">
        <div className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-700">INSIDE CARWISE</div>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900 max-w-xl">Car care, minus the mental load.</h2>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {FEATURES.map(f => {
            const Icon = f.icon
            return (
              <Card key={f.title} className="relative rounded-2xl p-6 shadow-sm">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${f.iconBg}`}>
                  <Icon size={20} className={f.iconColor} />
                </div>
                <div className="font-display mt-5 text-lg font-bold text-slate-900">{f.title}</div>
                <div className="mt-1 text-sm text-slate-600">{f.desc}</div>
                <ArrowUpRight size={16} className="absolute bottom-5 right-5 text-slate-300" />
              </Card>
            )
          })}
        </div>
      </section>

      <Modal open={authModal === 'login'} onClose={() => setAuthModal(null)}>
        <LoginForm onSuccess={() => setAuthModal(null)} onSwitchToSignup={() => setAuthModal('signup')} />
      </Modal>
      <Modal open={authModal === 'signup'} onClose={() => setAuthModal(null)}>
        <SignupForm onSuccess={() => setAuthModal(null)} onSwitchToLogin={() => setAuthModal('login')} />
      </Modal>
    </main>
  )
}
