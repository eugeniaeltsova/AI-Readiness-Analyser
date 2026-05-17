import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import ReportView from './ReportView'
import Navbar from './Navbar'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Constants ─────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { value: 'retail',        label: 'Retail' },
  { value: 'healthcare',    label: 'Healthcare' },
  { value: 'finance',       label: 'Finance' },
  { value: 'logistics',     label: 'Logistics' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'legal',         label: 'Legal' },
  { value: 'other',         label: 'Other' },
]

const COMPANY_SIZES = [
  { value: 'sme',        label: 'SME (under 250 employees)' },
  { value: 'mid_market', label: 'Mid-Market (250–2,500 employees)' },
  { value: 'enterprise', label: 'Enterprise (2,500+ employees)' },
]

const AI_MATURITY_OPTIONS = [
  { value: 'explore',    label: 'Explore',    desc: 'Aware of AI but no active initiatives' },
  { value: 'experiment', label: 'Experiment', desc: 'Running pilots or proof of concepts' },
  { value: 'expand',     label: 'Expand',     desc: 'Scaling successful pilots' },
  { value: 'embed',      label: 'Embed',      desc: 'AI is core to operations' },
]

const DATA_AVAILABILITY_OPTIONS = [
  { value: 'none',       label: 'No structured data' },
  { value: 'partial',    label: 'Some data, mostly spreadsheets' },
  { value: 'structured', label: 'Structured data in systems' },
  { value: 'advanced',   label: 'Rich, integrated data across systems' },
]

const REGULATORY_SUGGESTIONS = ['GDPR', 'HIPAA', 'SOX', 'PCI-DSS', 'FCA', 'DSGVO', 'ISO27001']

const PAIN_POINT_SUGGESTIONS = [
  'Manual repetitive processes',
  'High operational costs',
  'Slow decision making',
  'Data silos / disconnected systems',
  'Poor demand forecasting',
  'High error rates in manual work',
  'Lack of real-time visibility',
  'Customer churn / poor retention',
  'Compliance and reporting burden',
  'Talent gaps / skills shortage',
  'Reactive rather than predictive maintenance',
  'Invoice and payment delays',
  'Poor inventory management',
]

const GOAL_SUGGESTIONS = [
  'Reduce operational costs',
  'Improve customer experience',
  'Increase revenue',
  'Reduce manual work / automate processes',
  'Improve decision making with data',
  'Faster time to market',
  'Reduce errors and improve quality',
  'Scale operations without headcount growth',
  'Improve employee productivity',
  'Enhance regulatory compliance',
]

const INITIAL_FORM = {
  company_name:         '',
  industry:             '',
  company_size:         '',
  employee_count:       '',
  annual_revenue_range: '',
  ai_maturity_stage:    '',
  current_tools:        [],
  key_processes:        [],
  data_availability:    '',
  regulatory_context:   [],
  pain_points:          [],
  goals:                [],
  budget_range_min:     '',
  budget_range_max:     '',
  budget_currency:      'EUR',
}

const STEPS = ['Company Basics', 'Technology & Operations', 'Context & Constraints', 'Review & Submit']

// ── Budget helpers ────────────────────────────────────────────────────────────

function parseBudget(raw) {
  if (!raw && raw !== 0) return null
  const str = String(raw).trim().replace(/[,\s]/g, '')
  const lower = str.toLowerCase()
  const suffixes = { k: 1e3, m: 1e6, b: 1e9 }
  for (const [s, mult] of Object.entries(suffixes)) {
    if (lower.endsWith(s)) {
      const n = parseFloat(lower.slice(0, -1))
      return isNaN(n) ? null : n * mult
    }
  }
  const n = parseFloat(str)
  return isNaN(n) ? null : n
}

function formatBudget(value, currency) {
  if (value === null || value === undefined || value === '') return ''
  const symbol = currency === 'EUR' ? '€' : '$'
  return `${symbol}${Number(value).toLocaleString()}`
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls = (err) =>
  `w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition bg-white ${err ? 'border-red-400 bg-red-50' : 'border-slate-200'}`

const selectCls = (err) =>
  `w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition bg-white ${err ? 'border-red-400 bg-red-50 text-slate-800' : 'border-slate-200 text-slate-800'}`

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, optional, error, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {optional && <span className="text-xs text-slate-400">optional</span>}
      </div>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ── Simple tag input (type + Enter, no suggestions) ───────────────────────────

function SimpleTagInput({ value = [], onChange, placeholder }) {
  const [input, setInput] = useState('')

  const add = () => {
    const tag = input.trim()
    if (tag && !value.includes(tag)) onChange([...value, tag])
    setInput('')
  }

  const remove = (tag) => onChange(value.filter(t => t !== tag))

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
    if (e.key === 'Backspace' && !input && value.length) remove(value[value.length - 1])
  }

  return (
    <div className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-slate-900 focus-within:border-transparent transition">
      {value.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {tag}
          <button type="button" onClick={() => remove(tag)} className="text-slate-400 hover:text-slate-700 leading-none ml-0.5">×</button>
        </span>
      ))}
      <input
        className="flex-1 min-w-36 outline-none text-sm text-slate-800 placeholder:text-slate-400 bg-transparent"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder={value.length === 0 ? placeholder : 'Add more…'}
      />
    </div>
  )
}

// ── Currency toggle ───────────────────────────────────────────────────────────

function CurrencyToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5">
      {['EUR', 'USD'].map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`rounded-full px-3 py-0.5 text-xs font-semibold transition-all ${
            value === c ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  )
}

// ── Budget fields (manages display state internally) ──────────────────────────

function BudgetFields({ currency, onCurrencyChange, minValue, maxValue, onMinChange, onMaxChange }) {
  const [minRaw, setMinRaw] = useState(minValue !== null && minValue !== '' ? formatBudget(minValue, currency) : '')
  const [maxRaw, setMaxRaw] = useState(maxValue !== null && maxValue !== '' ? formatBudget(maxValue, currency) : '')

  useEffect(() => {
    if (minValue !== null && minValue !== '') setMinRaw(formatBudget(minValue, currency))
    if (maxValue !== null && maxValue !== '') setMaxRaw(formatBudget(maxValue, currency))
  }, [currency])

  const handleBlur = (raw, setRaw, onChange) => {
    const parsed = parseBudget(raw)
    onChange(parsed ?? '')
    setRaw(parsed !== null ? formatBudget(parsed, currency) : '')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Budget range</label>
        <span className="text-xs text-slate-400">optional</span>
        <CurrencyToggle value={currency} onChange={onCurrencyChange} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          className={inputCls(false)}
          value={minRaw}
          onChange={e => setMinRaw(e.target.value)}
          onBlur={() => handleBlur(minRaw, setMinRaw, onMinChange)}
          placeholder="Min — e.g. 50K or 500,000"
        />
        <input
          className={inputCls(false)}
          value={maxRaw}
          onChange={e => setMaxRaw(e.target.value)}
          onBlur={() => handleBlur(maxRaw, setMaxRaw, onMaxChange)}
          placeholder="Max — e.g. 300K or 1.5M"
        />
      </div>
    </div>
  )
}

// ── Single-select chips (industry, company size) ──────────────────────────────

function SingleSelectChips({ value, onChange, options, error }) {
  return (
    <div className={`flex flex-wrap gap-2 ${error ? 'p-2 rounded-lg border border-red-400 bg-red-50' : ''}`}>
      {options.map(o => {
        const selected = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(selected ? '' : o.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-all ${
              selected
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-800'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Suggestible tag input (suggestion chips + custom) ─────────────────────────

function SuggestibleTagInput({ value = [], onChange, suggestions = [], placeholder, error }) {
  const [input, setInput] = useState('')

  const add = (tag) => {
    const t = tag.trim()
    if (t && !value.includes(t)) onChange([...value, t])
  }

  const remove = (tag) => onChange(value.filter(t => t !== tag))

  const toggle = (s) => value.includes(s) ? remove(s) : add(s)

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (input.trim()) { add(input); setInput('') } }
    if (e.key === 'Backspace' && !input && value.length) remove(value[value.length - 1])
  }

  return (
    <div className="space-y-3">
      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map(s => {
          const selected = value.includes(s)
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                selected
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-800'
              }`}
            >
              {s}
            </button>
          )
        })}
      </div>
      {/* Selected pills + custom input */}
      <div className={`min-h-10 rounded-lg border px-3 py-2 flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-slate-900 focus-within:border-transparent transition ${error ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`}>
        {value.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            {tag}
            <button type="button" onClick={() => remove(tag)} className="text-slate-400 hover:text-slate-700 leading-none ml-0.5">×</button>
          </span>
        ))}
        <input
          className="flex-1 min-w-40 outline-none text-sm text-slate-800 placeholder:text-slate-400 bg-transparent"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={value.length === 0 ? (placeholder || 'Type to add custom…') : 'Add more…'}
        />
      </div>
    </div>
  )
}

// ── Review helpers ────────────────────────────────────────────────────────────

function ReviewSection({ title, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-100">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      </div>
      <dl className="px-4 divide-y divide-slate-100">{children}</dl>
    </div>
  )
}

function ReviewRow({ label, value }) {
  if (!value && value !== 0) return null
  if (Array.isArray(value) && value.length === 0) return null
  return (
    <div className="py-2.5 flex gap-4">
      <dt className="w-36 shrink-0 text-xs font-medium text-slate-500 pt-0.5">{label}</dt>
      <dd className="text-sm text-slate-800 flex-1">
        {Array.isArray(value)
          ? <div className="flex flex-wrap gap-1">{value.map(v => <span key={v} className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs text-slate-700">{v}</span>)}</div>
          : value}
      </dd>
    </div>
  )
}

// ── Step 1: Company Basics ────────────────────────────────────────────────────

function Step1({ data, set, errors }) {
  return (
    <div className="space-y-5">
      <Field label="Company name" error={errors.company_name}>
        <input
          className={inputCls(errors.company_name)}
          value={data.company_name}
          onChange={e => set('company_name')(e.target.value)}
          placeholder="e.g. Acme Corp"
        />
      </Field>

      <Field label="Industry" error={errors.industry}>
        <SingleSelectChips value={data.industry} onChange={set('industry')} options={INDUSTRIES} error={errors.industry} />
      </Field>

      <Field label="Company size" error={errors.company_size}>
        <SingleSelectChips value={data.company_size} onChange={set('company_size')} options={COMPANY_SIZES} error={errors.company_size} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Employee count" optional>
          <input
            type="number"
            className={inputCls(false)}
            value={data.employee_count}
            onChange={e => set('employee_count')(e.target.value)}
            placeholder="e.g. 350"
            min="1"
          />
        </Field>
        <Field label="Annual revenue range" error={errors.annual_revenue_range}>
          <input
            className={inputCls(errors.annual_revenue_range)}
            value={data.annual_revenue_range}
            onChange={e => set('annual_revenue_range')(e.target.value)}
            placeholder="e.g. €10M–€25M"
          />
        </Field>
      </div>
    </div>
  )
}

// ── Step 2: Technology & Operations ──────────────────────────────────────────

function Step2({ data, set, errors }) {
  return (
    <div className="space-y-5">
      <Field label="AI maturity stage" error={errors.ai_maturity_stage}>
        <select className={selectCls(errors.ai_maturity_stage)} value={data.ai_maturity_stage} onChange={e => set('ai_maturity_stage')(e.target.value)}>
          <option value="">Select maturity stage</option>
          {AI_MATURITY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label} — {o.desc}</option>
          ))}
        </select>
      </Field>

      <Field label="Current tools" optional>
        <SimpleTagInput
          value={data.current_tools}
          onChange={set('current_tools')}
          placeholder="Type a tool and press Enter — e.g. Salesforce, SAP…"
        />
      </Field>

      <Field label="Key processes" optional>
        <SimpleTagInput
          value={data.key_processes}
          onChange={set('key_processes')}
          placeholder="Type a process and press Enter — e.g. demand planning…"
        />
      </Field>

      <Field label="Data availability" error={errors.data_availability}>
        <select className={selectCls(errors.data_availability)} value={data.data_availability} onChange={e => set('data_availability')(e.target.value)}>
          <option value="">Select data situation</option>
          {DATA_AVAILABILITY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>
    </div>
  )
}

// ── Step 3: Context & Constraints ────────────────────────────────────────────

function Step3({ data, set, errors }) {
  return (
    <div className="space-y-6">
      <Field label="Regulatory context" optional>
        <SuggestibleTagInput
          value={data.regulatory_context}
          onChange={set('regulatory_context')}
          suggestions={REGULATORY_SUGGESTIONS}
          placeholder="Select above or type custom…"
        />
      </Field>

      <Field label="Pain points" error={errors.pain_points}>
        <SuggestibleTagInput
          value={data.pain_points}
          onChange={set('pain_points')}
          suggestions={PAIN_POINT_SUGGESTIONS}
          placeholder="Select above or describe your own…"
          error={errors.pain_points}
        />
      </Field>

      <Field label="Goals" error={errors.goals}>
        <SuggestibleTagInput
          value={data.goals}
          onChange={set('goals')}
          suggestions={GOAL_SUGGESTIONS}
          placeholder="Select above or describe your own…"
          error={errors.goals}
        />
      </Field>

      <BudgetFields
        currency={data.budget_currency}
        onCurrencyChange={set('budget_currency')}
        minValue={data.budget_range_min}
        maxValue={data.budget_range_max}
        onMinChange={set('budget_range_min')}
        onMaxChange={set('budget_range_max')}
      />
    </div>
  )
}

// ── Step 4: Review & Submit ───────────────────────────────────────────────────

function Step4({ data, profileId, reportId, reportStatus, report, onSubmit, submitting }) {
  const label = (arr, val) => arr.find(o => o.value === val)?.label || val

  // Post-submission: show report result
  if (reportId) {
    if (reportStatus === 'completed' && report) {
      const dims = report.readiness_score?.dimensions || {}
      return (
        <div className="space-y-5">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-sm font-semibold text-emerald-800">Analysis complete</p>
            <p className="text-3xl font-bold text-emerald-700 mt-1">
              {report.readiness_score?.overall ?? '—'}<span className="text-base font-normal text-emerald-600">/100</span>
            </p>
          </div>

          {Object.keys(dims).length > 0 && (
            <div className="rounded-lg border border-slate-200 p-4 space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Score breakdown</p>
              {Object.entries(dims).map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-slate-600 capitalize">{k.replaceAll('_', ' ')}</span>
                    <span className="text-xs font-medium text-slate-800">{v}/100</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-slate-800 transition-all" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {report.executive_summary && (
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Executive Summary</p>
              <p className="text-sm text-slate-700 leading-relaxed">{report.executive_summary}</p>
            </div>
          )}

          {report.recommended_use_cases?.length > 0 && (
            <div className="rounded-lg border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recommended Use Cases</p>
              {report.recommended_use_cases.map((uc, i) => (
                <div key={i} className="p-3 rounded-md bg-slate-50 border border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">{i + 1}. {uc.title}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{uc.rationale}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-slate-500">
                    <span>Cost: <span className="text-slate-700 font-medium">{uc.estimated_cost_range}</span></span>
                    <span>ROI: <span className="text-slate-700 font-medium">{uc.estimated_roi}</span></span>
                    <span>Complexity: <span className="text-slate-700 font-medium capitalize">{uc.implementation_complexity}</span></span>
                    <span>Time to value: <span className="text-slate-700 font-medium">{uc.time_to_value_months}mo</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {report.key_risks?.length > 0 && (
            <div className="rounded-lg border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Key Risks</p>
              {report.key_risks.map((r, i) => (
                <div key={i} className="p-3 rounded-md bg-amber-50 border border-amber-100">
                  <p className="text-xs font-semibold text-amber-800">{r.risk}</p>
                  <p className="text-xs text-amber-700 mt-1">{r.mitigation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (reportStatus === 'failed') {
      return (
        <div className="rounded-lg bg-red-50 border border-red-200 p-5 text-center">
          <p className="text-sm font-semibold text-red-800">Analysis failed</p>
          <p className="text-xs text-red-600 mt-1">Something went wrong on the server. Please try again.</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Analysis in progress…</p>
              <p className="text-xs text-amber-600 mt-0.5">This usually takes 20–40 seconds. Polling every 5s.</p>
            </div>
          </div>
          <p className="text-xs text-amber-500 mt-3 font-mono">report: {reportId}</p>
        </div>
      </div>
    )
  }

  // Pre-submission: show review summary
  return (
    <div className="space-y-4">
      <ReviewSection title="Company">
        <ReviewRow label="Name"     value={data.company_name} />
        <ReviewRow label="Industry" value={label(INDUSTRIES, data.industry)} />
        <ReviewRow label="Size"     value={label(COMPANY_SIZES, data.company_size)} />
        <ReviewRow label="Employees" value={data.employee_count} />
        <ReviewRow label="Revenue"  value={data.annual_revenue_range} />
      </ReviewSection>

      <ReviewSection title="Technology & Operations">
        <ReviewRow label="AI Maturity"   value={label(AI_MATURITY_OPTIONS, data.ai_maturity_stage)} />
        <ReviewRow label="Current Tools" value={data.current_tools} />
        <ReviewRow label="Key Processes" value={data.key_processes} />
        <ReviewRow label="Data"          value={label(DATA_AVAILABILITY_OPTIONS, data.data_availability)} />
      </ReviewSection>

      <ReviewSection title="Context & Constraints">
        <ReviewRow label="Regulatory"  value={data.regulatory_context} />
        <ReviewRow label="Pain Points" value={data.pain_points} />
        <ReviewRow label="Goals"       value={data.goals} />
        {(data.budget_range_min || data.budget_range_max) && (
          <ReviewRow label="Budget" value={`$${Number(data.budget_range_min || 0).toLocaleString()} – $${Number(data.budget_range_max || 0).toLocaleString()}`} />
        )}
      </ReviewSection>

      <Button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full"
        size="lg"
      >
        {submitting ? 'Starting analysis…' : 'Run AI Readiness Analysis →'}
      </Button>
    </div>
  )
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(step, data) {
  const e = {}
  if (step === 1) {
    if (!data.company_name.trim())        e.company_name = 'Company name is required'
    if (!data.industry)                   e.industry = 'Select an industry'
    if (!data.company_size)               e.company_size = 'Select a company size'
    if (!data.annual_revenue_range.trim()) e.annual_revenue_range = 'Revenue range is required'
  }
  if (step === 2) {
    if (!data.ai_maturity_stage)          e.ai_maturity_stage = 'Select a maturity stage'
    if (!data.data_availability)          e.data_availability = 'Select a data availability level'
  }
  if (step === 3) {
    if (data.pain_points.length === 0)    e.pain_points = 'Add at least one pain point'
    if (data.goals.length === 0)          e.goals = 'Add at least one goal'
  }
  return e
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QuestionnaireForm() {
  const [step, setStep]               = useState(1)
  const [data, setData]               = useState(INITIAL_FORM)
  const [errors, setErrors]           = useState({})
  const [submitting, setSubmitting]   = useState(false)
  const [profileId, setProfileId]     = useState(null)
  const [reportId, setReportId]       = useState(null)
  const [reportStatus, setReportStatus] = useState(null)
  const [report, setReport]           = useState(null)
  const pollRef                       = useRef(null)
  const navigate                      = useNavigate()

  const set = (key) => (val) => setData(prev => ({ ...prev, [key]: val }))

  // Polling
  useEffect(() => {
    if (!reportId || !profileId) return

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/reports/${profileId}`)
        const reports = await res.json()
        const target = reports.find(r => r.id === reportId)
        if (!target) return

        setReportStatus(target.status)

        if (target.status === 'completed') {
          setReport(target.full_report)
          clearInterval(pollRef.current)
        }
        if (target.status === 'failed') {
          clearInterval(pollRef.current)
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
    }, 5000)

    return () => clearInterval(pollRef.current)
  }, [reportId, profileId])

  const goNext = () => {
    const errs = validate(step, data)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setStep(s => Math.min(s + 1, 4))
  }

  const goBack = () => {
    setErrors({})
    setStep(s => Math.max(s - 1, 1))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // Create profile
      const profileRes = await fetch(`${API_URL}/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name:         data.company_name,
          industry:             data.industry,
          company_size:         data.company_size,
          employee_count:       data.employee_count ? parseInt(data.employee_count) : null,
          annual_revenue_range: data.annual_revenue_range,
          ai_maturity_stage:    data.ai_maturity_stage,
          current_tools:        data.current_tools,
          key_processes:        data.key_processes,
          data_availability:    data.data_availability || null,
          regulatory_context:   data.regulatory_context,
          pain_points:          data.pain_points,
          goals:                data.goals,
          budget_range_min:     data.budget_range_min !== '' ? parseFloat(data.budget_range_min) : null,
          budget_range_max:     data.budget_range_max !== '' ? parseFloat(data.budget_range_max) : null,
          budget_currency:      data.budget_currency,
        }),
      })
      if (!profileRes.ok) throw new Error('Profile creation failed')
      const { id: newProfileId } = await profileRes.json()
      setProfileId(newProfileId)

      // Trigger analysis
      const analyzeRes = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: newProfileId }),
      })
      if (!analyzeRes.ok) throw new Error('Analysis failed to start')
      const { report_id: newReportId } = await analyzeRes.json()
      setReportId(newReportId)
      setReportStatus('processing')
      navigate(`/reports/${newReportId}`, { replace: true })
    } catch (err) {
      console.error('Submit error:', err)
      setReportStatus('failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Full-page report — replaces the form entirely
  if (step === 4 && reportStatus === 'completed' && report) {
    return <ReportView report={report} company={data.company_name} />
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar minimal />

      <div className="py-10 px-4 flex justify-center items-start">
      <div className="w-full max-w-2xl">

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between mb-2.5">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`text-xs font-medium transition-colors ${
                  i + 1 === step ? 'text-slate-900' : i + 1 < step ? 'text-slate-400' : 'text-slate-300'
                }`}
              >
                {s}
              </span>
            ))}
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200">
            <div
              className="h-1.5 rounded-full bg-slate-900 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs text-slate-400">Step {step} of {STEPS.length}</p>
            {!reportId && (
              <button
                onClick={() => navigate('/')}
                className="text-xs text-slate-400 hover:text-slate-700 transition"
              >
                ← Back to Home
              </button>
            )}
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
          <h2 className="text-base font-semibold text-slate-900 mb-5">
            {step === 4 && reportStatus === 'completed' ? 'Analysis Complete' : STEPS[step - 1]}
          </h2>

          {step === 1 && <Step1 data={data} set={set} errors={errors} />}
          {step === 2 && <Step2 data={data} set={set} errors={errors} />}
          {step === 3 && <Step3 data={data} set={set} errors={errors} />}
          {step === 4 && (
            <Step4
              data={data}
              profileId={profileId}
              reportId={reportId}
              reportStatus={reportStatus}
              report={report}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
        </div>

        {/* Navigation */}
        {!(step === 4 && reportId) && (
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={goBack} disabled={step === 1}>
              ← Back
            </Button>
            {step < 4 && (
              <Button onClick={goNext}>
                Next →
              </Button>
            )}
          </div>
        )}

      </div>
      </div>
    </div>
  )
}
