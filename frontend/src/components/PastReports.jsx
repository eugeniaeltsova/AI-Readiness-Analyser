import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from './Navbar'
import ReportView from './ReportView'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function scoreBadge(score) {
  if (!score && score !== 0) return { label: '—', bg: 'bg-slate-100', text: 'text-slate-500' }
  if (score <= 40) return { label: 'Not Ready',      bg: 'bg-red-100',     text: 'text-red-700' }
  if (score <= 60) return { label: 'Exploring',      bg: 'bg-amber-100',   text: 'text-amber-700' }
  if (score <= 80) return { label: 'Good Candidate', bg: 'bg-blue-100',    text: 'text-blue-700' }
  return               { label: 'High Potential', bg: 'bg-emerald-100', text: 'text-emerald-700' }
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PastReports() {
  const navigate             = useNavigate()
  const { reportId }         = useParams()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/api/reports/all`)
      .then(r => r.json())
      .then(data => {
        setReports(data)
        if (reportId) {
          const match = data.find(r => r.id === reportId)
          if (match) setSelected(match)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [reportId])

  const openReport = (r) => {
    setSelected(r)
    navigate(`/reports/${r.id}`, { replace: true })
    window.scrollTo(0, 0)
  }

  const backToList = () => {
    setSelected(null)
    navigate('/reports', { replace: true })
    window.scrollTo(0, 0)
  }

  // ── Individual report view ──────────────────────────────────────────────────
  if (selected) {
    return (
      <div>
        {/* Thin back bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center gap-4">
          <button
            onClick={backToList}
            className="text-xs font-medium text-slate-500 hover:text-slate-900 transition flex items-center gap-1"
          >
            ← Back to reports
          </button>
        </div>
        <ReportView report={selected.full_report} company={selected.company_name} />
      </div>
    )
  }

  // ── Reports list ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar hidePastReports />

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-slate-900">Past Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">{reports.length} completed {reports.length === 1 ? 'analysis' : 'analyses'}</p>
        </div>

        {loading && (
          <div className="text-center py-20 text-sm text-slate-400">Loading reports…</div>
        )}

        {!loading && reports.length === 0 && (
          <div className="text-center py-24 space-y-4">
            <p className="text-slate-500 text-sm">No reports yet. Start your first analysis.</p>
            <button
              onClick={() => navigate('/analyze')}
              className="rounded-lg bg-slate-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-700 transition"
            >
              Start Analysis →
            </button>
          </div>
        )}

        {!loading && reports.length > 0 && (
          <div className="space-y-4">
            {reports.map(r => {
              const badge = scoreBadge(r.readiness_score)
              return (
                <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between gap-4 hover:border-slate-400 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h2 className="text-base font-bold text-slate-900 truncate">{r.company_name || 'Unknown'}</h2>
                      {r.industry && (
                        <span className="rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-xs font-medium capitalize">
                          {r.industry.replace('_', ' ')}
                        </span>
                      )}
                      {r.ai_maturity_stage && (
                        <span className="rounded-full border border-slate-200 text-slate-500 px-2.5 py-0.5 text-xs font-medium capitalize">
                          {r.ai_maturity_stage}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className={`rounded-full px-2.5 py-0.5 font-medium ${badge.bg} ${badge.text}`}>
                        {r.readiness_score ?? '—'}/100 · {badge.label}
                      </span>
                      <span>{formatDate(r.generated_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => openReport(r)}
                    className="shrink-0 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 transition"
                  >
                    View Report →
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
