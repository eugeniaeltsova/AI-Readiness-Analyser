import { useNavigate } from 'react-router-dom'

const PRINT_STYLES = `
  #report-print-header { display: none; }

  @media print {
    #report-print-header {
      display: block;
      font-size: 11px;
      color: #555;
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 1px solid #ddd;
    }
    .no-print { display: none !important; }
    body { background: #fff !important; }
    * {
      box-shadow: none !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .avoid-break { page-break-inside: avoid; break-inside: avoid; }
    @page { margin: 18mm 20mm; }
  }
`

const DIM_LABELS = {
  data_readiness:           'Data Readiness',
  process_repeatability:    'Process Repeatability',
  roi_potential:            'ROI Potential',
  technical_feasibility:    'Technical Feasibility',
  organizational_readiness: 'Organizational Readiness',
}

function scoreBadge(score) {
  if (score <= 40) return { label: 'Not Ready',       bg: 'bg-red-100',     text: 'text-red-700',     bar: 'bg-red-500' }
  if (score <= 60) return { label: 'Exploring',       bg: 'bg-amber-100',   text: 'text-amber-700',   bar: 'bg-amber-500' }
  if (score <= 80) return { label: 'Good Candidate',  bg: 'bg-blue-100',    text: 'text-blue-700',    bar: 'bg-blue-500' }
  return               { label: 'High Potential',  bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500' }
}

const COMPLEXITY_CLS = {
  low:    'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100   text-amber-700',
  high:   'bg-red-100     text-red-700',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">{children}</p>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 p-6 avoid-break ${className}`}>
      {children}
    </div>
  )
}

function DimBar({ label, value }) {
  const badge = scoreBadge(value)
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-sm font-semibold text-slate-800">{value}<span className="text-slate-400 font-normal">/100</span></span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${badge.bar} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReportView({ report, company }) {
  const navigate = useNavigate()
  const score  = report?.readiness_score?.overall ?? 0
  const dims   = report?.readiness_score?.dimensions ?? {}
  const badge  = scoreBadge(score)
  const today  = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const phases = report?.implementation_roadmap ?? []

  return (
    <div id="report-root" className="min-h-screen bg-slate-50 py-10 px-4">
      <style>{PRINT_STYLES}</style>

      {/* Print-only header */}
      <div id="report-print-header">
        {company} — AI Readiness Report — {today}
      </div>

      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── 1. Header ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 avoid-break">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2 no-print">
                <button
                  onClick={() => navigate('/analyze')}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 transition flex items-center gap-1"
                >
                  ← New Analysis
                </button>
              </div>
              <p className="text-sm font-medium text-slate-500 mb-1">{company}</p>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Readiness Report</h1>
              <p className="text-xs text-slate-400 mt-1">{today}</p>
            </div>
            <button
              onClick={() => window.print()}
              className="no-print shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 hover:text-slate-800 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>

          <div className="mt-8 flex items-end gap-5">
            <div>
              <span className="text-8xl font-black text-slate-900 leading-none">{score}</span>
              <span className="text-2xl text-slate-400 font-light">/100</span>
            </div>
            <div className="mb-2">
              <span className={`inline-block rounded-full px-4 py-1.5 text-sm font-semibold ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. Score breakdown ────────────────────────────────────────────── */}
        {Object.keys(dims).length > 0 && (
          <Card>
            <SectionTitle>Score Breakdown</SectionTitle>
            <div className="space-y-4">
              {Object.entries(dims).map(([k, v]) => (
                <DimBar key={k} label={DIM_LABELS[k] ?? k} value={v} />
              ))}
            </div>
          </Card>
        )}

        {/* ── 3. Executive summary ──────────────────────────────────────────── */}
        {report?.executive_summary && (
          <Card>
            <SectionTitle>Executive Summary</SectionTitle>
            <p className="text-sm text-slate-700 leading-7 max-w-prose">{report.executive_summary}</p>
          </Card>
        )}

        {/* ── 4. Recommended use cases ──────────────────────────────────────── */}
        {report?.recommended_use_cases?.length > 0 && (
          <Card>
            <SectionTitle>Recommended Use Cases</SectionTitle>
            <div className="space-y-4">
              {report.recommended_use_cases.map((uc, i) => (
                <div key={i} className="p-4 rounded-lg bg-slate-50 border border-slate-100 avoid-break">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-slate-900">
                      <span className="text-slate-400 font-normal mr-1.5">{i + 1}.</span>
                      {uc.title}
                    </p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${COMPLEXITY_CLS[uc.implementation_complexity] ?? 'bg-slate-100 text-slate-600'}`}>
                      {uc.implementation_complexity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">{uc.rationale}</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                    <span>Cost <span className="font-medium text-slate-700">{uc.estimated_cost_range}</span></span>
                    <span>ROI <span className="font-medium text-slate-700">{uc.estimated_roi}</span></span>
                    <span>Time to value <span className="font-medium text-slate-700">{uc.time_to_value_months} months</span></span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── 5. Implementation roadmap ─────────────────────────────────────── */}
        {phases.length > 0 && (
          <Card>
            <SectionTitle>Implementation Roadmap</SectionTitle>
            <div className="flex items-stretch gap-2">
              {phases.map((phase, i) => (
                <>
                  {/* Phase card */}
                  <div key={phase.phase} className="flex-1 rounded-lg border border-slate-200 bg-white overflow-hidden avoid-break">
                    {/* Card header */}
                    <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-4xl font-black text-slate-100 leading-none select-none">{phase.phase}</span>
                        <span className="text-xs rounded-full bg-slate-100 text-slate-500 px-2.5 py-0.5 font-medium">{phase.duration}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 -mt-1">{phase.title}</p>
                    </div>
                    {/* Initiatives */}
                    <ul className="px-4 py-3 space-y-1.5">
                      {phase.initiatives.map((item, j) => (
                        <li key={j} className="flex gap-2 text-xs text-slate-600">
                          <span className="text-slate-300 shrink-0 mt-px">—</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Arrow connector */}
                  {i < phases.length - 1 && (
                    <div className="flex items-center shrink-0 text-slate-300 text-lg no-print" aria-hidden="true">›</div>
                  )}
                </>
              ))}
            </div>
          </Card>
        )}

        {/* ── 6. Key risks ──────────────────────────────────────────────────── */}
        {report?.key_risks?.length > 0 && (
          <Card>
            <SectionTitle>Key Risks</SectionTitle>
            <div className="space-y-3">
              {report.key_risks.map((r, i) => (
                <div key={i} className="p-4 rounded-lg bg-amber-50 border border-amber-100 avoid-break">
                  <p className="text-sm font-semibold text-amber-900 mb-1">{r.risk}</p>
                  <p className="text-xs text-amber-700 leading-relaxed">{r.mitigation}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Footnote ──────────────────────────────────────────────────────── */}
        <p className="text-xs text-slate-400 leading-relaxed text-center px-4 pb-4 no-print">
          Cost and ROI estimates are indicative benchmarks drawn from McKinsey, BCG, and Stanford HAI industry research (2024–2025).
          Actual results depend on implementation complexity, vendor selection, and organizational readiness.
          Figures represent median outcomes across documented implementations.
        </p>

      </div>
    </div>
  )
}
