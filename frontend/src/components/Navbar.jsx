import { Link, useNavigate } from 'react-router-dom'

export default function Navbar({ minimal = false, hidePastReports = false }) {
  const navigate = useNavigate()
  return (
    <nav className="w-full bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="text-sm font-bold text-slate-900 tracking-tight hover:text-slate-700 transition">
          AI Readiness Analyzer
        </Link>
        {!minimal && (
          <div className="flex items-center gap-4">
            {!hidePastReports && (
              <Link to="/reports" className="text-sm text-slate-600 hover:text-slate-900 transition font-medium">
                Past Reports
              </Link>
            )}
            <button
              onClick={() => navigate('/analyze')}
              className="rounded-lg bg-slate-900 text-white px-4 py-1.5 text-sm font-semibold hover:bg-slate-700 transition"
            >
              Start Analysis →
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
