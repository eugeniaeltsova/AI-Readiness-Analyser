import { useNavigate } from 'react-router-dom'
import Navbar from './Navbar'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const STEPS = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    label: 'Fill in the questionnaire',
    desc:  '15 questions about your client\'s business, tech stack, and goals.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    label: 'AI analyses the profile',
    desc:  'GPT-4o cross-references your client with 25+ industry AI use cases.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    label: 'Get a board-ready report',
    desc:  'Scored report with matched use cases, cost estimates, and a roadmap.',
  },
]

const VALUE_PROPS = [
  { title: 'Readiness Score 0–100',    desc: 'A single number across 5 dimensions: data, process, ROI, tech, and org readiness.' },
  { title: 'Matched AI Use Cases',     desc: 'Up to 5 curated use cases ranked by fit for your client\'s industry and constraints.' },
  { title: 'Cost & ROI Estimates',     desc: 'Realistic cost ranges and ROI benchmarks drawn from industry data.' },
  { title: 'Implementation Roadmap',   desc: 'A 3-phase plan sequenced from foundation through scale to optimise.' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  const handleViewSample = async () => {
    try {
      const res = await fetch(`${API_URL}/api/reports/all`)
      const reports = await res.json()
      if (reports.length > 0) {
        navigate(`/reports/${reports[0].id}`)
      } else {
        navigate('/reports')
      }
    } catch {
      navigate('/reports')
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 mb-6">
          Powered by GPT-4o · 25+ AI use cases
        </div>
        <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight mb-5">
          Find out if your client is ready for AI — in minutes.
        </h1>
        <p className="text-lg text-slate-500 leading-relaxed mb-10 max-w-2xl mx-auto">
          Answer 15 questions. Get a scored readiness report, matched AI use cases, cost estimates, and an implementation roadmap.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/analyze')}
            className="rounded-xl bg-slate-900 text-white px-7 py-3 text-sm font-bold hover:bg-slate-700 transition shadow-sm"
          >
            Start Analysis →
          </button>
          <button
            onClick={handleViewSample}
            className="rounded-xl border border-slate-200 bg-white text-slate-700 px-7 py-3 text-sm font-semibold hover:border-slate-400 transition"
          >
            View Sample Report
          </button>
        </div>
      </section>

      {/* ── 3-step process ──────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-y border-slate-100 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center mb-10">How it works</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="relative bg-white rounded-xl border border-slate-200 p-6">
                <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </div>
                <div className="text-slate-400 mb-3">{s.icon}</div>
                <p className="text-sm font-semibold text-slate-900 mb-1">{s.label}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Value props 2×2 ─────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center mb-10">What you get</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {VALUE_PROPS.map((v, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-6">
              <p className="text-sm font-bold text-slate-900 mb-1.5">{v.title}</p>
              <p className="text-sm text-slate-500 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-14">
          <button
            onClick={() => navigate('/analyze')}
            className="rounded-xl bg-slate-900 text-white px-8 py-3.5 text-sm font-bold hover:bg-slate-700 transition shadow-sm"
          >
            Start your first analysis →
          </button>
        </div>
      </section>
    </div>
  )
}
